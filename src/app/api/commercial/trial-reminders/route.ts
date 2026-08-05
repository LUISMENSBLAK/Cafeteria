import { NextRequest, NextResponse } from 'next/server'

import { sendCommercialEmailOnce } from '@/lib/email/commercial'
import { trialExpiredTemplate, trialReminderTemplate } from '@/lib/email/templates'
import { createAdminClient } from '@/lib/supabase/admin'

const DAY_MS = 86_400_000

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authorization = request.headers.get('authorization')
  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date()
  const { data: tenants, error } = await admin
    .from('tenants')
    .select('id, slug, nombre_negocio, nombre_contacto, email_contacto, trial_termina_en')
    .eq('billing_status', 'trialing')
    .lte('trial_termina_en', new Date(now.getTime() + 3 * DAY_MS).toISOString())
    .order('trial_termina_en', { ascending: true })
    .limit(250)

  if (error) {
    return NextResponse.json({ error: 'No se pudieron consultar las pruebas.' }, { status: 500 })
  }

  const result = { reminder3d: 0, reminder1d: 0, reminder0d: 0, expired: 0, failed: 0 }

  for (const tenant of tenants ?? []) {
    const trialEnd = Date.parse(tenant.trial_termina_en)
    const remaining = trialEnd - now.getTime()

    try {
      if (remaining <= 0) {
        await sendCommercialEmailOnce({
          tenantId: tenant.id,
          eventType: 'trial_expired',
          eventKey: 'trial-expired',
          to: tenant.email_contacto,
          template: trialExpiredTemplate(tenant.nombre_negocio, tenant.slug),
        })
        await admin
          .from('tenants')
          .update({ billing_status: 'expired', access_expires_at: tenant.trial_termina_en })
          .eq('id', tenant.id)
          .eq('billing_status', 'trialing')
        result.expired += 1
        continue
      }

      let daysRemaining: 3 | 1 | 0 | null = null
      let eventType = ''
      if (remaining > 2 * DAY_MS) {
        daysRemaining = 3
        eventType = 'trial_reminder_3d'
      } else if (remaining > 0.5 * DAY_MS && remaining <= DAY_MS) {
        daysRemaining = 1
        eventType = 'trial_reminder_1d'
      } else if (remaining <= 0.5 * DAY_MS) {
        daysRemaining = 0
        eventType = 'trial_reminder_0d'
      }

      if (daysRemaining !== null) {
        await sendCommercialEmailOnce({
          tenantId: tenant.id,
          eventType,
          eventKey: eventType,
          to: tenant.email_contacto,
          template: trialReminderTemplate({
            nombreNegocio: tenant.nombre_negocio,
            nombreContacto: tenant.nombre_contacto,
            slug: tenant.slug,
            trialTerminaEn: tenant.trial_termina_en,
            daysRemaining,
          }),
        })
        if (daysRemaining === 3) result.reminder3d += 1
        if (daysRemaining === 1) result.reminder1d += 1
        if (daysRemaining === 0) result.reminder0d += 1
      }
    } catch (sendError) {
      console.error(
        'Commercial reminder failed:',
        sendError instanceof Error ? sendError.message : 'unknown',
      )
      result.failed += 1
    }
  }

  return NextResponse.json(result)
}

