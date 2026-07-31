import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface WelcomeEmailProps {
  email: string;
  nombreNegocio: string;
  nombreContacto: string;
  password?: string;
  slug?: string;
  trialTerminaEn?: Date;
}

export async function sendWelcomeEmail({ email, nombreNegocio, nombreContacto, password, slug, trialTerminaEn }: WelcomeEmailProps) {
  const loginUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/demo/${slug}/login`;
  const endDate = trialTerminaEn ? new Date(trialTerminaEn).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }) : 'en 15 días';

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <h1 style="color: #7A5A32; text-align: center;">¡Bienvenido a Abaroa Bakery POS!</h1>
      <p>Hola <strong>${nombreContacto}</strong>,</p>
      <p>Gracias por registrar a <strong>${nombreNegocio}</strong>. Tu periodo de prueba gratuita de 15 días ha comenzado y terminará el <strong>${endDate}</strong>.</p>
      
      <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #eee;">
        <h3 style="margin-top: 0; color: #7A5A32;">Tus datos de acceso:</h3>
        <p><strong>Enlace de acceso:</strong> <a href="${loginUrl}" style="color: #7A5A32; text-decoration: underline;">${loginUrl}</a></p>
        <p><strong>Usuario / Correo:</strong> ${email}</p>
        <p><strong>Contraseña:</strong> <span style="background-color: #eee; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${password}</span></p>
      </div>
      
      <p style="font-size: 14px; color: #666;">
        <em>Importante: Para iniciar sesión, dirígete al enlace, selecciona la pestaña "Correo y contraseña" y utiliza estas credenciales. Te recomendamos cambiar la contraseña una vez que ingreses.</em>
      </p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${loginUrl}" style="background-color: #7A5A32; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Acceder a mi POS</a>
      </div>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
      
      <div style="font-size: 13px; color: #888; text-align: center;">
        <p>Si tienes alguna duda o necesitas configurar hardware (como impresoras térmicas), contáctanos en:</p>
        <p><strong>Innova Network</strong></p>
        <p>Email: <a href="mailto:innovanetwork15@gmail.com" style="color: #888;">innovanetwork15@gmail.com</a> | Teléfono: +34 624 06 54 34</p>
      </div>
    </div>
  `;

  // Lo ideal es verificar un dominio propio en Resend para evitar caer en spam.
  // Por ahora, si no hay dominio, usamos onboarding@resend.dev
  await resend.emails.send({
    from: 'Abaroa POS <onboarding@resend.dev>',
    to: [email],
    subject: `¡Bienvenido a tu prueba gratuita, ${nombreNegocio}!`,
    html: htmlContent,
  });
}
