import type { EmailTemplate } from './templates'
import { sendTransactionalEmail } from './sendEmail'
import { createAdminClient } from '@/lib/supabase/admin'

export async function sendCommercialEmailOnce({
  tenantId,
  eventType,
  eventKey,
  to,
  template,
}: {
  tenantId: string
  eventType: string
  eventKey: string
  to: string
  template: EmailTemplate
}) {
  const admin = createAdminClient()
  const { error: insertError } = await admin.from('commercial_email_events').insert({
    tenant_id: tenantId,
    event_type: eventType,
    event_key: eventKey,
  })

  if (insertError?.code === '23505') {
    const { data: existing } = await admin
      .from('commercial_email_events')
      .select('sent_at')
      .eq('tenant_id', tenantId)
      .eq('event_type', eventType)
      .eq('event_key', eventKey)
      .single()
    if (existing?.sent_at) return null
  } else if (insertError) {
    throw new Error('No se pudo registrar el correo comercial.')
  }

  try {
    const resendId = await sendTransactionalEmail({
      to,
      template,
      idempotencyKey: `${tenantId}/${eventType}/${eventKey}`.slice(0, 256),
    })
    await admin
      .from('commercial_email_events')
      .update({
        resend_email_id: resendId,
        sent_at: new Date().toISOString(),
        failed_at: null,
        error_code: null,
      })
      .eq('tenant_id', tenantId)
      .eq('event_type', eventType)
      .eq('event_key', eventKey)
    return resendId
  } catch (error) {
    await admin
      .from('commercial_email_events')
      .update({
        failed_at: new Date().toISOString(),
        error_code: 'EMAIL_SEND_FAILED',
      })
      .eq('tenant_id', tenantId)
      .eq('event_type', eventType)
      .eq('event_key', eventKey)
    throw error
  }
}

