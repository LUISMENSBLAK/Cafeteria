import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'

import { getBillingConfig } from '@/lib/billing/config'
import { sendCommercialEmailOnce } from '@/lib/email/commercial'
import {
  oneTimePaymentFailedTemplate,
  paymentConfirmedTemplate,
  paymentFailedTemplate,
  subscriptionCanceledTemplate,
} from '@/lib/email/templates'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe, stripeObjectId, subscriptionPeriodEnd } from '@/lib/stripe/server'

type TenantBillingRow = {
  id: string
  slug: string
  nombre_negocio: string
  email_contacto: string
  billing_status: string
  grace_period_ends_at: string | null
}

const tenantSelect =
  'id, slug, nombre_negocio, email_contacto, billing_status, grace_period_ends_at'

function formatMoney(amountInCents: number | null | undefined) {
  if (typeof amountInCents !== 'number') return 'Importe confirmado en Stripe'
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
  }).format(amountInCents / 100)
}

async function claimEvent(event: Stripe.Event) {
  const admin = createAdminClient()
  const { error } = await admin.from('stripe_webhook_events').insert({
    event_id: event.id,
    event_type: event.type,
    stripe_created_at: new Date(event.created * 1000).toISOString(),
    status: 'processing',
  })

  if (!error) return true
  if (error.code !== '23505') throw new Error('No se pudo registrar el webhook.')

  const { data: existing } = await admin
    .from('stripe_webhook_events')
    .select('status, attempts, received_at')
    .eq('event_id', event.id)
    .single()

  if (!existing || existing.status === 'processed' || existing.status === 'ignored') return false
  const now = new Date().toISOString()
  const staleBefore = new Date(Date.now() - 5 * 60_000).toISOString()
  const retry = admin
    .from('stripe_webhook_events')
    .update({
      status: 'processing',
      attempts: (existing.attempts ?? 1) + 1,
      error_code: null,
      received_at: now,
    })
    .eq('event_id', event.id)

  const { data: claimed, error: retryError } =
    existing.status === 'processing'
      ? await retry
          .eq('status', 'processing')
          .lt('received_at', staleBefore)
          .select('event_id')
          .maybeSingle()
      : await retry.eq('status', 'failed').select('event_id').maybeSingle()

  if (retryError) throw new Error('No se pudo reintentar el webhook.')
  return Boolean(claimed)
}

async function finishEvent(
  event: Stripe.Event,
  status: 'processed' | 'failed' | 'ignored',
  tenantId?: string | null,
) {
  const admin = createAdminClient()
  await admin
    .from('stripe_webhook_events')
    .update({
      status,
      tenant_id: tenantId ?? null,
      processed_at: status === 'failed' ? null : new Date().toISOString(),
      error_code: status === 'failed' ? 'PROCESSING_FAILED' : null,
    })
    .eq('event_id', event.id)
}

async function tenantById(tenantId: string) {
  const { data } = await createAdminClient()
    .from('tenants')
    .select(tenantSelect)
    .eq('id', tenantId)
    .single()
  return data as TenantBillingRow | null
}

async function tenantForSubscription(subscription: Stripe.Subscription) {
  const metadataTenantId = subscription.metadata?.tenant_id
  if (metadataTenantId) return tenantById(metadataTenantId)

  const { data } = await createAdminClient()
    .from('tenants')
    .select(tenantSelect)
    .eq('stripe_subscription_id', subscription.id)
    .limit(1)
    .maybeSingle()
  return data as TenantBillingRow | null
}

async function syncSubscription(
  subscription: Stripe.Subscription,
  options: {
    invoice?: Stripe.Invoice
    failed?: boolean
    eventId: string
  },
) {
  const tenant = await tenantForSubscription(subscription)
  if (!tenant) throw new Error('No se encontró el tenant de la suscripción.')

  const admin = createAdminClient()
  const periodEnd = subscriptionPeriodEnd(subscription)
  const customerId = stripeObjectId(subscription.customer)

  if (options.failed) {
    const { gracePeriodDays } = getBillingConfig()
    const graceEndsAt =
      tenant.billing_status === 'past_due' && tenant.grace_period_ends_at
        ? tenant.grace_period_ends_at
        : new Date(Date.now() + gracePeriodDays * 86_400_000).toISOString()

    const { error } = await admin
      .from('tenants')
      .update({
        billing_status: 'past_due',
        plan_type: 'monthly',
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        current_period_end: periodEnd,
        access_expires_at: periodEnd,
        cancel_at_period_end: subscription.cancel_at_period_end,
        grace_period_ends_at: graceEndsAt,
        last_payment_failed_at: new Date().toISOString(),
      })
      .eq('id', tenant.id)
    if (error) throw new Error('No se pudo registrar el pago fallido.')

    await sendCommercialEmailOnce({
      tenantId: tenant.id,
      eventType: 'payment_failed',
      eventKey: options.invoice?.id ?? options.eventId,
      to: tenant.email_contacto,
      template: paymentFailedTemplate({
        nombreNegocio: tenant.nombre_negocio,
        slug: tenant.slug,
        graceEndsAt,
      }),
    })
    return tenant
  }

  const isCanceled = subscription.status === 'canceled'
  const isPaidActive = subscription.status === 'active' || subscription.status === 'trialing'
  const billingStatus = isCanceled ? 'canceled' : isPaidActive ? 'active' : 'past_due'
  const { gracePeriodDays } = getBillingConfig()
  const graceEndsAt = isPaidActive
    ? null
    : tenant.grace_period_ends_at ??
      new Date(Date.now() + gracePeriodDays * 86_400_000).toISOString()
  const invoice = options.invoice
  const update = {
    billing_status: billingStatus,
    plan_type: 'monthly',
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    current_period_end: periodEnd,
    access_expires_at: periodEnd,
    cancel_at_period_end: subscription.cancel_at_period_end,
    grace_period_ends_at: graceEndsAt,
    ...(invoice && invoice.status === 'paid'
      ? {
          last_payment_at: new Date().toISOString(),
          last_payment_reference: invoice.id,
          last_payment_failed_at: null,
        }
      : {}),
  }

  const { error } = await admin.from('tenants').update(update).eq('id', tenant.id)
  if (error) throw new Error('No se pudo sincronizar la suscripción.')

  if (invoice?.status === 'paid') {
    await sendCommercialEmailOnce({
      tenantId: tenant.id,
      eventType: 'payment_confirmed',
      eventKey: `invoice:${invoice.id}`,
      to: tenant.email_contacto,
      template: paymentConfirmedTemplate({
        nombreNegocio: tenant.nombre_negocio,
        slug: tenant.slug,
        planType: 'monthly',
        amount: formatMoney(invoice.amount_paid),
        reference: invoice.id,
      }),
    })
  }

  if (subscription.cancel_at_period_end || isCanceled) {
    await sendCommercialEmailOnce({
      tenantId: tenant.id,
      eventType: 'subscription_canceled',
      eventKey: `${subscription.id}:${periodEnd ?? 'ended'}`,
      to: tenant.email_contacto,
      template: subscriptionCanceledTemplate({
        nombreNegocio: tenant.nombre_negocio,
        slug: tenant.slug,
        accessUntil: periodEnd,
      }),
    })
  }

  return tenant
}

async function activateOneTimePayment({
  tenantId,
  customerId,
  paymentIntentId,
  amount,
}: {
  tenantId: string
  customerId: string | null
  paymentIntentId: string
  amount?: number | null
}) {
  const tenant = await tenantById(tenantId)
  if (!tenant) throw new Error('No se encontró el tenant del pago.')

  const { error } = await createAdminClient()
    .from('tenants')
    .update({
      billing_status: 'active',
      plan_type: 'one_time',
      stripe_customer_id: customerId,
      stripe_payment_intent_id: paymentIntentId,
      licencia_pagada_en: new Date().toISOString(),
      last_payment_at: new Date().toISOString(),
      last_payment_failed_at: null,
      last_payment_reference: paymentIntentId,
      access_expires_at: null,
      current_period_end: null,
      grace_period_ends_at: null,
      cancel_at_period_end: false,
    })
    .eq('id', tenant.id)
  if (error) throw new Error('No se pudo activar la licencia.')

  await sendCommercialEmailOnce({
    tenantId: tenant.id,
    eventType: 'payment_confirmed',
    eventKey: `one-time:${paymentIntentId}`,
    to: tenant.email_contacto,
    template: paymentConfirmedTemplate({
      nombreNegocio: tenant.nombre_negocio,
      slug: tenant.slug,
      planType: 'one_time',
      amount: formatMoney(amount),
      reference: paymentIntentId,
    }),
  })
  return tenant
}

async function processEvent(event: Stripe.Event) {
  const stripe = getStripe()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const tenantId = session.metadata?.tenant_id
      const plan = session.metadata?.plan
      if (!tenantId || !plan || session.payment_status !== 'paid') return null

      if (plan === 'unico') {
        const paymentIntentId = stripeObjectId(session.payment_intent)
        if (!paymentIntentId) throw new Error('El pago único no contiene PaymentIntent.')
        return activateOneTimePayment({
          tenantId,
          customerId: stripeObjectId(session.customer),
          paymentIntentId,
          amount: session.amount_total,
        })
      }

      if (plan === 'mensual') {
        const subscriptionId = stripeObjectId(session.subscription)
        if (!subscriptionId) throw new Error('La sesión no contiene suscripción.')
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        return syncSubscription(subscription, { eventId: event.id })
      }
      return null
    }

    case 'payment_intent.succeeded': {
      const intent = event.data.object as Stripe.PaymentIntent
      if (intent.metadata?.plan !== 'unico' || !intent.metadata?.tenant_id) return null
      return activateOneTimePayment({
        tenantId: intent.metadata.tenant_id,
        customerId: stripeObjectId(intent.customer),
        paymentIntentId: intent.id,
        amount: intent.amount_received,
      })
    }

    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice
      const subscriptionId = stripeObjectId(
        invoice.parent?.subscription_details?.subscription,
      )
      if (!subscriptionId) return null
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      return syncSubscription(subscription, { invoice, eventId: event.id })
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const subscriptionId = stripeObjectId(
        invoice.parent?.subscription_details?.subscription,
      )
      if (!subscriptionId) return null
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      return syncSubscription(subscription, { invoice, failed: true, eventId: event.id })
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const eventSubscription = event.data.object as Stripe.Subscription
      let subscription = eventSubscription
      try {
        subscription = await stripe.subscriptions.retrieve(eventSubscription.id)
      } catch {
        // En deleted, el objeto del evento sigue siendo la fuente autoritativa.
      }
      return syncSubscription(subscription, { eventId: event.id })
    }

    case 'payment_intent.payment_failed': {
      const intent = event.data.object as Stripe.PaymentIntent
      if (intent.metadata?.plan !== 'unico' || !intent.metadata?.tenant_id) return null
      const tenant = await tenantById(intent.metadata.tenant_id)
      if (!tenant) throw new Error('No se encontró el tenant del pago fallido.')
      const { error } = await createAdminClient()
        .from('tenants')
        .update({ last_payment_failed_at: new Date().toISOString() })
        .eq('id', tenant.id)
      if (error) throw new Error('No se pudo registrar el pago fallido.')
      await sendCommercialEmailOnce({
        tenantId: tenant.id,
        eventType: 'payment_failed',
        eventKey: `one-time:${intent.id}`,
        to: tenant.email_contacto,
        template: oneTimePaymentFailedTemplate(tenant.nombre_negocio, tenant.slug),
      })
      return tenant
    }

    default:
      return null
  }
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Solicitud no válida.' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(
      await request.text(),
      signature,
      webhookSecret,
    )
  } catch {
    return NextResponse.json({ error: 'Firma no válida.' }, { status: 400 })
  }

  try {
    if (!(await claimEvent(event))) {
      return NextResponse.json({ received: true, duplicate: true })
    }

    const tenant = await processEvent(event)
    const handledTypes = new Set([
      'checkout.session.completed',
      'payment_intent.succeeded',
      'payment_intent.payment_failed',
      'invoice.paid',
      'invoice.payment_failed',
      'customer.subscription.updated',
      'customer.subscription.deleted',
    ])
    await finishEvent(event, handledTypes.has(event.type) ? 'processed' : 'ignored', tenant?.id)
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error(
      `Stripe webhook processing failed (${event.type}):`,
      error instanceof Error ? error.message : 'unknown',
    )
    await finishEvent(event, 'failed')
    return NextResponse.json({ error: 'No se pudo procesar el evento.' }, { status: 500 })
  }
}
