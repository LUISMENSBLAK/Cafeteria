import { NextRequest, NextResponse } from 'next/server'

import {
  firstMonthlyChargeAt,
  MONTHLY_PRICING_VERSION,
  MONTHLY_RECURRING_AMOUNT_CENTS,
  MONTHLY_SETUP_AMOUNT_CENTS,
} from '@/lib/billing/pricing'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe/server'
import { createClient } from '@/utils/supabase/server'

type CheckoutPlan = 'mensual' | 'unico'

function isCheckoutPlan(value: string | null): value is CheckoutPlan {
  return value === 'mensual' || value === 'unico'
}

function appBaseUrl() {
  return (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
}

async function readCheckoutRequest(request: NextRequest) {
  if (request.method === 'GET') {
    return {
      slug: request.nextUrl.searchParams.get('slug'),
      plan: request.nextUrl.searchParams.get('plan'),
    }
  }

  const formData = await request.formData()
  return {
    slug: String(formData.get('slug') || ''),
    plan: String(formData.get('plan') || ''),
  }
}

async function createCheckout(request: NextRequest) {
  const { slug, plan } = await readCheckoutRequest(request)
  if (!slug || !isCheckoutPlan(plan)) {
    return NextResponse.json({ error: 'Solicitud de pago no válida.' }, { status: 400 })
  }

  const sessionClient = await createClient()
  const {
    data: { user },
  } = await sessionClient.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${appBaseUrl()}/demo/${encodeURIComponent(slug)}/login`, 303)
  }

  const admin = createAdminClient()
  const { data: employee } = await admin
    .from('employees')
    .select('tenant_id, activo')
    .eq('id', user.id)
    .single()

  if (!employee?.activo || !employee.tenant_id) {
    return NextResponse.json({ error: 'No pudimos validar el acceso al negocio.' }, { status: 403 })
  }

  const { data: tenant } = await admin
    .from('tenants')
    .select(
      'id, slug, nombre_negocio, email_contacto, stripe_customer_id, stripe_checkout_session_id',
    )
    .eq('id', employee.tenant_id)
    .eq('slug', slug)
    .single()

  if (!tenant) {
    return NextResponse.json({ error: 'No pudimos validar el negocio.' }, { status: 404 })
  }

  const stripe = getStripe()
  const pricingVersion = plan === 'mensual' ? MONTHLY_PRICING_VERSION : 'lifetime-5000-v1'

  if (tenant.stripe_checkout_session_id) {
    try {
      const previousSession = await stripe.checkout.sessions.retrieve(
        tenant.stripe_checkout_session_id,
      )
      if (
        previousSession.status === 'open' &&
        previousSession.url &&
        previousSession.metadata?.plan === plan &&
        previousSession.metadata?.tenant_id === tenant.id &&
        previousSession.metadata?.pricing_version === pricingVersion
      ) {
        return NextResponse.redirect(previousSession.url, 303)
      }
    } catch {
      // La sesión anterior ya no existe o venció; se crea una nueva abajo.
    }
  }

  let customerId = tenant.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create(
      {
        email: tenant.email_contacto,
        name: tenant.nombre_negocio,
        metadata: { tenant_id: tenant.id, slug: tenant.slug },
      },
      { idempotencyKey: `tenant-customer-${tenant.id}` },
    )
    customerId = customer.id
    const { error } = await admin
      .from('tenants')
      .update({ stripe_customer_id: customerId })
      .eq('id', tenant.id)
    if (error) throw new Error('No se pudo asociar el cliente de pago.')
  }

  const lifetimePrice = process.env.STRIPE_PRICE_LIFETIME
  const monthlyRecurringPrice = process.env.STRIPE_PRICE_MONTHLY_RECURRING

  if (
    (plan === 'unico' && !lifetimePrice) ||
    (plan === 'mensual' && !monthlyRecurringPrice)
  ) {
    return NextResponse.json(
      { error: 'La opción de pago está temporalmente en configuración.' },
      { status: 503 },
    )
  }

  if (plan === 'mensual') {
    const recurringPrice = await stripe.prices.retrieve(monthlyRecurringPrice!)
    const validRecurringPrice =
      recurringPrice.active &&
      recurringPrice.currency === 'mxn' &&
      recurringPrice.unit_amount === MONTHLY_RECURRING_AMOUNT_CENTS &&
      recurringPrice.recurring?.interval === 'month' &&
      (recurringPrice.recurring.interval_count ?? 1) === 1

    if (!validRecurringPrice) {
      console.error('STRIPE_PRICE_MONTHLY_RECURRING debe ser un Price activo de $500 MXN/mes.')
      return NextResponse.json(
        { error: 'La opción de pago está temporalmente en configuración.' },
        { status: 503 },
      )
    }
  }

  const metadata = {
    tenant_id: tenant.id,
    slug: tenant.slug,
    plan,
    pricing_version: pricingVersion,
  }
  const baseUrl = appBaseUrl()
  const successUrl = `${baseUrl}/demo/${encodeURIComponent(slug)}/pago/procesando?session_id={CHECKOUT_SESSION_ID}`
  const cancelUrl = `${baseUrl}/demo/${encodeURIComponent(slug)}/pago/no-completado`
  const lineItems =
    plan === 'unico'
      ? [{ price: lifetimePrice!, quantity: 1 }]
      : [
          {
            price_data: {
              currency: 'mxn',
              unit_amount: MONTHLY_SETUP_AMOUNT_CENTS,
              product_data: {
                name: 'Instalación y activación de Innova Coffee POS',
                description: 'Pago inicial único. La mensualidad comienza un mes después.',
                metadata: { pricing_version: pricingVersion },
              },
            },
            quantity: 1,
          },
          { price: monthlyRecurringPrice!, quantity: 1 },
        ]

  const checkoutSession = await stripe.checkout.sessions.create(
    {
      customer: customerId,
      client_reference_id: tenant.id,
      mode: plan === 'mensual' ? 'subscription' : 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
      metadata,
      ...(plan === 'mensual'
        ? {
            subscription_data: {
              metadata,
              trial_end: Math.floor(firstMonthlyChargeAt().getTime() / 1000),
              description: 'Mensualidad de Innova Coffee POS; primer cobro un mes después de la instalación.',
            },
          }
        : { payment_intent_data: { metadata } }),
      success_url: successUrl,
      cancel_url: cancelUrl,
      locale: 'es',
    },
    {
      idempotencyKey: `checkout-${tenant.id}-${plan}-${Math.floor(Date.now() / 60_000)}`,
    },
  )

  if (!checkoutSession.url) throw new Error('Stripe no devolvió una URL de pago.')

  const { error: saveSessionError } = await admin
    .from('tenants')
    .update({ stripe_checkout_session_id: checkoutSession.id })
    .eq('id', tenant.id)
  if (saveSessionError) throw new Error('No se pudo guardar la sesión de pago.')

  return NextResponse.redirect(checkoutSession.url, 303)
}

export async function POST(request: NextRequest) {
  try {
    return await createCheckout(request)
  } catch (error) {
    console.error('Stripe checkout error:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.json(
      { error: 'No pudimos iniciar el pago. Intenta nuevamente o contacta a soporte.' },
      { status: 500 },
    )
  }
}

// Compatibilidad con los enlaces existentes; las nuevas pantallas usan POST.
export async function GET(request: NextRequest) {
  return POST(request)
}
