import { sendTransactionalEmail } from './sendEmail'
import { welcomeTemplate } from './templates'

interface WelcomeEmailProps {
  email: string
  nombreNegocio: string
  nombreContacto: string
  password?: string
  slug?: string
  trialTerminaEn?: Date | string | null
}

export async function sendWelcomeEmail({
  email,
  nombreNegocio,
  nombreContacto,
  password,
  slug,
  trialTerminaEn,
}: WelcomeEmailProps) {
  if (!password || !slug) throw new Error('Faltan datos para el correo de bienvenida.')

  return sendTransactionalEmail({
    to: email,
    template: welcomeTemplate({
      email,
      nombreNegocio,
      nombreContacto,
      password,
      slug,
      trialTerminaEn,
    }),
    idempotencyKey: `welcome/${slug}`,
  })
}
