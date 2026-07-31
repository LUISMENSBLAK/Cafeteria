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
  const endDate = trialTerminaEn ? new Date(trialTerminaEn).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }) : 'en 14 días';

  const htmlContent = `
  <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    
    <!-- Header con logo de Innova Network -->
    <div style="background-color: #0f172a; padding: 32px 24px; text-align: center;">
      <img src="https://innovanetwork.es/brand/innova-network-lockup.png" alt="Innova Network" style="height: 36px; width: auto;" />
    </div>

    <!-- Cuerpo -->
    <div style="padding: 40px 32px;">
      <h1 style="color: #0f172a; font-size: 22px; margin: 0 0 8px 0;">¡Bienvenido, ${nombreContacto}! 👋</h1>
      <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
        Tu punto de venta para <strong>${nombreNegocio}</strong> ya está listo. Tu prueba gratuita de 14 días comenzó hoy y termina el <strong>${endDate}</strong> — tiempo de sobra para probarlo con tu equipo antes de decidir.
      </p>

      <!-- Tarjeta de credenciales -->
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 24px; margin: 0 0 28px 0;">
        <p style="color: #64748b; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px 0;">Tus datos de acceso</p>
        <table style="width: 100%; font-size: 14px; color: #1e293b;">
          <tr>
            <td style="padding: 4px 0; color: #64748b;">Enlace</td>
            <td style="padding: 4px 0; text-align: right;"><a href="${loginUrl}" style="color: #0f172a; font-weight: bold; text-decoration: none;">Entrar al POS →</a></td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748b;">Correo</td>
            <td style="padding: 4px 0; text-align: right; font-weight: bold;">${email}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748b;">Contraseña</td>
            <td style="padding: 4px 0; text-align: right;">
              <span style="background-color: #e2e8f0; padding: 3px 8px; border-radius: 4px; font-family: monospace; font-size: 13px;">${password}</span>
            </td>
          </tr>
        </table>
      </div>

      <!-- Botón CTA -->
      <div style="text-align: center; margin: 0 0 28px 0;">
        <a href="${loginUrl}" style="background-color: #0f172a; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
          Acceder a mi POS
        </a>
      </div>

      <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; margin: 0;">
        <em>Tip: en el primer ingreso, selecciona la pestaña "Correo y contraseña" y usa los datos de arriba. Te recomendamos cambiar tu contraseña una vez dentro.</em>
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
      <img src="https://innovanetwork.es/brand/innova-mark.png" alt="" style="height: 20px; width: auto; margin-bottom: 8px;" />
      <p style="color: #64748b; font-size: 12px; margin: 0 0 4px 0;">
        ¿Dudas o necesitas configurar hardware (impresoras térmicas)?
      </p>
      <p style="color: #64748b; font-size: 12px; margin: 0;">
        <a href="mailto:innovanetwork15@gmail.com" style="color: #0f172a; text-decoration: none;">innovanetwork15@gmail.com</a> · +34 624 06 54 34
      </p>
    </div>
  </div>
`;

  // Lo ideal es verificar un dominio propio en Resend para evitar caer en spam.
  // Por ahora, si no hay dominio, usamos onboarding@resend.dev
  await resend.emails.send({
    from: 'Innova Network <bienvenida@innovanetwork.es>',
    to: [email],
    subject: `¡Bienvenido a tu prueba gratuita, ${nombreNegocio}!`,
    html: htmlContent,
  });
}
