import { Resend } from 'resend'

import type { EmailTemplate } from './templates'

let resendClient: Resend | null = null

function getResend() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('Resend no está configurado en el servidor.')
  if (!resendClient) resendClient = new Resend(apiKey)
  return resendClient
}

export async function sendTransactionalEmail({
  to,
  template,
  idempotencyKey,
}: {
  to: string
  template: EmailTemplate
  idempotencyKey: string
}) {
  const fromAddress = process.env.RESEND_FROM_EMAIL || 'bienvenida@innovanetwork.es'
  const { data, error } = await getResend().emails.send(
    {
      from: `Innova Network <${fromAddress}>`,
      to: [to],
      subject: template.subject,
      html: template.html,
      text: template.text,
    },
    { idempotencyKey },
  )

  if (error) throw new Error(error.message)
  return data?.id ?? null
}

