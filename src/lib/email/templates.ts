import type { PlanType } from '@/lib/billing/access'

const SUPPORT_EMAIL = 'innovanetwork15@gmail.com'
const SUPPORT_PHONE = '+34 624 06 54 34'
const BRAND_LOGO_URL = 'https://innovanetwork.es/brand/innova-network-lockup.png'

export interface EmailTemplate {
  subject: string
  html: string
  text: string
}

export function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function absoluteUrl(path: string) {
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`
}

function formatDate(value: string | Date | null | undefined) {
  if (!value) return 'fecha por confirmar'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return 'fecha por confirmar'
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Mexico_City',
  }).format(date)
}

function button(label: string, url: string) {
  const safeLabel = escapeHtml(label)
  const safeUrl = escapeHtml(url)
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 8px 0;">
      <tr>
        <td bgcolor="#1c1917" align="center" style="border-radius:10px;">
          <a href="${safeUrl}" target="_blank" style="display:block;min-height:48px;line-height:48px;padding:0 24px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;text-align:center;border-radius:10px;">${safeLabel}</a>
        </td>
      </tr>
    </table>`
}

function dataBlock(label: string, value: string, mono = false) {
  return `
    <tr>
      <td style="padding:0 0 10px 0;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f5f5f4;border:1px solid #e7e5e4;border-radius:9px;">
          <tr>
            <td style="padding:13px 14px;">
              <div style="color:#57534e;font-size:11px;line-height:16px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;">${escapeHtml(label)}</div>
              <div style="margin-top:3px;color:#1c1917;font-size:14px;line-height:21px;font-weight:600;${mono ? 'font-family:Menlo,Consolas,monospace;letter-spacing:.2px;' : ''}overflow-wrap:anywhere;word-break:break-word;">${escapeHtml(value)}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>`
}

function layout({
  preheader,
  title,
  intro,
  content,
}: {
  preheader: string
  title: string
  intro: string
  content: string
}) {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${escapeHtml(title)}</title>
  <style>
    @media only screen and (max-width:620px){.email-shell{width:100%!important}.email-pad{padding-left:20px!important;padding-right:20px!important}.email-title{font-size:25px!important;line-height:31px!important}}
    @media (prefers-color-scheme:dark){.email-bg{background:#0c0a09!important}.email-card{background:#1c1917!important}.email-copy{color:#e7e5e4!important}.email-muted{color:#d6d3d1!important}}
  </style>
</head>
<body class="email-bg" style="margin:0;padding:0;background:#f5f5f4;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="email-bg" style="width:100%;background:#f5f5f4;">
    <tr>
      <td align="center" style="padding:20px 10px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" class="email-shell email-card" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #e7e5e4;border-radius:14px;overflow:hidden;">
          <tr>
            <td bgcolor="#1c1917" style="padding:18px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td width="170" valign="middle">
                    <img src="${BRAND_LOGO_URL}" width="150" alt="Innova Network" style="display:block;width:150px;max-width:100%;height:auto;border:0;" />
                  </td>
                  <td align="right" valign="middle" style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;">
                    <div style="font-size:13px;line-height:18px;font-weight:700;">Innova Coffee POS</div>
                    <div style="font-size:11px;line-height:16px;color:#d6d3d1;">Por Innova Network</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="email-pad" style="padding:34px 34px 28px 34px;font-family:Arial,Helvetica,sans-serif;">
              <h1 class="email-title email-copy" style="margin:0 0 12px 0;color:#1c1917;font-size:28px;line-height:35px;font-weight:700;letter-spacing:-.4px;">${escapeHtml(title)}</h1>
              <p class="email-muted" style="margin:0 0 22px 0;color:#57534e;font-size:15px;line-height:24px;">${intro}</p>
              ${content}
            </td>
          </tr>
          <tr>
            <td class="email-pad" style="padding:22px 34px;background:#fafaf9;border-top:1px solid #e7e5e4;font-family:Arial,Helvetica,sans-serif;">
              <p style="margin:0 0 7px;color:#1c1917;font-size:13px;line-height:20px;font-weight:700;">¿Necesitas ayuda para configurar impresoras, productos o a tu equipo?</p>
              <p style="margin:0;color:#57534e;font-size:12px;line-height:19px;overflow-wrap:anywhere;">
                <a href="mailto:${SUPPORT_EMAIL}" style="color:#854d0e;text-decoration:underline;">${SUPPORT_EMAIL}</a> · ${SUPPORT_PHONE}
              </p>
              <p style="margin:14px 0 0;color:#78716c;font-size:11px;line-height:17px;">Innova Network · Mensaje transaccional · © ${new Date().getFullYear()}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function welcomeTemplate({
  email,
  nombreNegocio,
  nombreContacto,
  password,
  slug,
  trialTerminaEn,
}: {
  email: string
  nombreNegocio: string
  nombreContacto: string
  password: string
  slug: string
  trialTerminaEn?: string | Date | null
}): EmailTemplate {
  const loginUrl = absoluteUrl(`/demo/${encodeURIComponent(slug)}/login`)
  const endDate = formatDate(trialTerminaEn)
  const title = `¡Tu punto de venta está listo, ${nombreContacto}!`
  const content = `
    <p class="email-copy" style="margin:0 0 18px;color:#292524;font-size:15px;line-height:24px;">Ya configuramos el espacio de <strong>${escapeHtml(nombreNegocio)}</strong>. Tu prueba gratuita de 14 días comienza hoy.</p>
    <p style="margin:0 0 22px;color:#57534e;font-size:14px;line-height:22px;">Tu prueba estará disponible hasta el <strong style="color:#1c1917;">${escapeHtml(endDate)}</strong>.</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
      ${dataBlock('Acceso', 'Abrir mi punto de venta')}
      ${dataBlock('Correo', email)}
      ${dataBlock('Contraseña temporal', password, true)}
    </table>
    ${button('Entrar a mi punto de venta', loginUrl)}
    <div style="margin-top:22px;padding:15px 16px;background:#fffbeb;border-left:4px solid #a16207;border-radius:8px;color:#44403c;font-size:13px;line-height:21px;">
      En el primer acceso selecciona la opción de correo y contraseña e introduce los datos anteriores.
    </div>
    <p style="margin:18px 0 0;color:#78716c;font-size:12px;line-height:19px;">Por seguridad, guarda estas credenciales en un lugar privado y no reenvíes este correo a personas ajenas a tu negocio.</p>`

  return {
    subject: 'Tu prueba de Innova Coffee POS ya está lista',
    html: layout({
      preheader: 'Tu prueba de Innova Coffee POS ya está activa. Aquí tienes tus datos de acceso.',
      title,
      intro: `Todo está preparado para que ${escapeHtml(nombreNegocio)} empiece a trabajar con Innova Coffee POS.`,
      content,
    }),
    text: `${title}\n\nYa configuramos el espacio de ${nombreNegocio}. Tu prueba gratuita de 14 días comienza hoy y estará disponible hasta el ${endDate}.\n\nAcceso: ${loginUrl}\nCorreo: ${email}\nContraseña temporal: ${password}\n\nEn el primer acceso selecciona la opción de correo y contraseña e introduce los datos anteriores. Guarda estas credenciales en un lugar privado.\n\nSoporte: ${SUPPORT_EMAIL} · ${SUPPORT_PHONE}`,
  }
}

export function trialReminderTemplate({
  nombreNegocio,
  nombreContacto,
  slug,
  trialTerminaEn,
  daysRemaining,
}: {
  nombreNegocio: string
  nombreContacto: string
  slug: string
  trialTerminaEn: string
  daysRemaining: 3 | 1 | 0
}): EmailTemplate {
  const plansUrl = absoluteUrl(`/demo/${encodeURIComponent(slug)}/vencido`)
  const endDate = formatDate(trialTerminaEn)
  const timing = daysRemaining === 0 ? 'vence hoy' : daysRemaining === 1 ? 'vence mañana' : 'vence en 3 días'
  const title = `Tu prueba ${timing}`
  const intro = `Hola, ${escapeHtml(nombreContacto)}. La prueba de ${escapeHtml(nombreNegocio)} finaliza el ${escapeHtml(endDate)}.`
  return {
    subject: `${nombreNegocio}: tu prueba ${timing}`,
    html: layout({
      preheader: `La prueba de ${nombreNegocio} ${timing}. Revisa las opciones para continuar.`,
      title,
      intro,
      content: `<p class="email-copy" style="margin:0;color:#292524;font-size:15px;line-height:24px;">Tus datos y configuración permanecen en tu cuenta. Puedes revisar con calma la licencia de pago único o el plan con mensualidad.</p>${button('Ver opciones para continuar', plansUrl)}`,
    }),
    text: `${title}\n\nLa prueba de ${nombreNegocio} finaliza el ${endDate}. Tus datos y configuración permanecen en tu cuenta.\n\nOpciones: ${plansUrl}\nSoporte: ${SUPPORT_EMAIL}`,
  }
}

export function trialExpiredTemplate(nombreNegocio: string, slug: string): EmailTemplate {
  const plansUrl = absoluteUrl(`/demo/${encodeURIComponent(slug)}/vencido`)
  return {
    subject: `${nombreNegocio}: tu prueba ha finalizado`,
    html: layout({
      preheader: 'Tu prueba terminó. Elige una licencia para continuar usando tu punto de venta.',
      title: 'Tu prueba ha finalizado',
      intro: `El acceso de ${escapeHtml(nombreNegocio)} está pausado hasta que elijas una forma de pago.`,
      content: `<p class="email-copy" style="margin:0;color:#292524;font-size:15px;line-height:24px;">No eliminamos la información del negocio al terminar la prueba. Al activar una licencia podrás continuar con tus datos y configuración disponibles.</p>${button('Elegir una licencia', plansUrl)}`,
    }),
    text: `Tu prueba ha finalizado\n\nEl acceso de ${nombreNegocio} está pausado. No eliminamos la información del negocio al terminar la prueba.\n\nElige una licencia: ${plansUrl}\nSoporte: ${SUPPORT_EMAIL}`,
  }
}

function planLabel(planType: PlanType) {
  return planType === 'one_time' ? 'Licencia de pago único' : 'Plan con mensualidad'
}

export function paymentConfirmedTemplate({
  nombreNegocio,
  slug,
  planType,
  amount,
  reference,
}: {
  nombreNegocio: string
  slug: string
  planType: PlanType
  amount: string
  reference?: string | null
}): EmailTemplate {
  const posUrl = absoluteUrl(`/demo/${encodeURIComponent(slug)}/login`)
  const referenceBlock = reference ? dataBlock('Referencia', reference) : ''
  return {
    subject: `${nombreNegocio}: pago confirmado`,
    html: layout({
      preheader: 'Tu pago fue confirmado y el acceso a Innova Coffee POS está activo.',
      title: 'Pago confirmado',
      intro: `El acceso de ${escapeHtml(nombreNegocio)} ya está activo.`,
      content: `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${dataBlock('Plan', planLabel(planType))}${dataBlock('Importe confirmado', amount)}${referenceBlock}${dataBlock('Estado', 'Activo')}</table><p class="email-copy" style="margin:10px 0 0;color:#292524;font-size:14px;line-height:22px;">Tus datos y configuración continúan disponibles.</p>${button('Entrar a mi punto de venta', posUrl)}`,
    }),
    text: `Pago confirmado\n\nNegocio: ${nombreNegocio}\nPlan: ${planLabel(planType)}\nImporte: ${amount}\nEstado: Activo${reference ? `\nReferencia: ${reference}` : ''}\n\nEntrar: ${posUrl}\nSoporte: ${SUPPORT_EMAIL}`,
  }
}

export function paymentFailedTemplate({
  nombreNegocio,
  slug,
  graceEndsAt,
}: {
  nombreNegocio: string
  slug: string
  graceEndsAt: string
}): EmailTemplate {
  const regularizeUrl = absoluteUrl(`/demo/${encodeURIComponent(slug)}/regularizar`)
  const deadline = formatDate(graceEndsAt)
  return {
    subject: `${nombreNegocio}: revisa tu mensualidad`,
    html: layout({
      preheader: 'No pudimos confirmar tu mensualidad. Tienes un periodo de gracia para regularizarla.',
      title: 'No pudimos confirmar tu mensualidad',
      intro: `El método de pago de ${escapeHtml(nombreNegocio)} necesita atención.`,
      content: `<p class="email-copy" style="margin:0;color:#292524;font-size:15px;line-height:24px;">Puedes seguir usando el sistema durante el periodo de gracia, hasta el <strong>${escapeHtml(deadline)}</strong>. Actualiza el método de pago desde el portal seguro de Stripe.</p>${button('Regularizar mensualidad', regularizeUrl)}`,
    }),
    text: `No pudimos confirmar tu mensualidad\n\nPuedes seguir usando ${nombreNegocio} durante el periodo de gracia, hasta el ${deadline}.\n\nRegularizar: ${regularizeUrl}\nSoporte: ${SUPPORT_EMAIL}`,
  }
}

export function oneTimePaymentFailedTemplate(
  nombreNegocio: string,
  slug: string,
): EmailTemplate {
  const plansUrl = absoluteUrl(`/demo/${encodeURIComponent(slug)}/vencido`)
  return {
    subject: `${nombreNegocio}: no pudimos confirmar tu pago`,
    html: layout({
      preheader: 'El pago de tu licencia no se completó. Puedes intentarlo de nuevo de forma segura.',
      title: 'Tu pago no se completó',
      intro: `No pudimos confirmar la licencia de pago único de ${escapeHtml(nombreNegocio)}. No se realizó ninguna activación.`,
      content: `<p class="email-copy" style="margin:0;color:#292524;font-size:15px;line-height:24px;">Puedes volver a intentarlo desde la pantalla de licencias. Si ves un cargo pendiente, consulta primero con tu banco o escribe a soporte.</p>${button('Volver a intentar el pago', plansUrl)}`,
    }),
    text: `Tu pago no se completó\n\nNo pudimos confirmar la licencia de pago único de ${nombreNegocio}. No se realizó ninguna activación.\n\nVolver a intentar: ${plansUrl}\nSoporte: ${SUPPORT_EMAIL}`,
  }
}

export function subscriptionCanceledTemplate({
  nombreNegocio,
  slug,
  accessUntil,
}: {
  nombreNegocio: string
  slug: string
  accessUntil: string | null
}): EmailTemplate {
  const plansUrl = absoluteUrl(`/demo/${encodeURIComponent(slug)}/vencido`)
  const date = formatDate(accessUntil)
  return {
    subject: `${nombreNegocio}: suscripción cancelada`,
    html: layout({
      preheader: 'Tu suscripción fue cancelada. Conservas acceso hasta el final del periodo pagado.',
      title: 'Tu suscripción fue cancelada',
      intro: `Registramos la cancelación del plan mensual de ${escapeHtml(nombreNegocio)}.`,
      content: `<p class="email-copy" style="margin:0;color:#292524;font-size:15px;line-height:24px;">Conservas acceso hasta el <strong>${escapeHtml(date)}</strong>. Después de esa fecha el sistema quedará pausado, sin eliminar la información del negocio. Puedes reactivar cuando lo necesites.</p>${button('Ver opciones de reactivación', plansUrl)}`,
    }),
    text: `Tu suscripción fue cancelada\n\n${nombreNegocio} conserva acceso hasta el ${date}. Después el sistema quedará pausado, sin eliminar la información del negocio.\n\nReactivar: ${plansUrl}\nSoporte: ${SUPPORT_EMAIL}`,
  }
}
