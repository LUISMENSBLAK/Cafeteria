import { headers } from 'next/headers'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const headersList = await headers()
  const rawName = headersList.get('x-business-name')
  const businessName = rawName ? decodeURIComponent(rawName) : slug
  return {
    title: `Prueba Vencida — ${businessName}`,
  }
}

export default async function VencidoPage({ params }: Props) {
  const { slug } = await params
  const headersList = await headers()
  const rawName = headersList.get('x-business-name')
  const businessName = rawName ? decodeURIComponent(rawName) : slug
  const rawLogo = headersList.get('x-logo-url')
  const logoUrl = rawLogo ? decodeURIComponent(rawLogo) : undefined

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-xl shadow-xl overflow-hidden p-8 text-center border border-gray-100">
        {logoUrl ? (
          <img src={logoUrl} alt={businessName} className="h-16 mx-auto mb-6 object-contain" />
        ) : (
          <div className="text-5xl mb-3">🔒</div>
        )}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{businessName}</h1>
          <p className="text-sm opacity-80 mb-6">Sistema Punto de Venta</p>
        

        {/* Body */}
        <div className="text-center">
          <h2 className="text-xl font-bold text-[var(--color-negro)] mb-3">
            Tu periodo de prueba ha finalizado
          </h2>
          <p className="text-[var(--color-gris)] mb-8 leading-relaxed">
            Gracias por probar nuestro POS. Para seguir usando todas las funciones sin interrupciones,
            activa tu licencia completa.
          </p>

          {/* Beneficios */}
          <ul className="text-left space-y-3 mb-8 text-sm text-[var(--color-negro)]">
            {[
              'Acceso ilimitado para todo tu equipo',
              'Soporte personalizado por WhatsApp',
              'Actualizaciones continuas incluidas',
              'Configuración de impresora térmica',
              'Reportes y cortes de caja completos',
            ].map(b => (
              <li key={b} className="flex items-center gap-3">
                <span className="text-[var(--color-bronce)] font-bold text-lg">✓</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>

          {/* CTA — Opciones de Pago Stripe */}
          <div className="space-y-4">
            <a
              href={`/api/stripe/checkout?slug=${slug}&plan=mensual`}
              className="block w-full bg-[var(--color-bronce)] text-[var(--color-crema)] text-center font-bold uppercase tracking-widest py-4 rounded-xl hover:bg-[var(--color-negro)] transition-colors text-sm shadow-md"
            >
              Mensualidad — $500 MXN/mes
            </a>
            
            <a
              href={`/api/stripe/checkout?slug=${slug}&plan=unico`}
              className="block w-full bg-white text-[var(--color-bronce)] border-2 border-[var(--color-bronce)] text-center font-bold uppercase tracking-widest py-4 rounded-xl hover:bg-[var(--color-bronce)] hover:text-white transition-colors text-sm shadow-sm"
            >
              Pago único — $5,000 MXN (sin mensualidades)
            </a>
          </div>

          <p className="text-xs text-[var(--color-gris)] mt-4">
            ¿Preguntas? Escríbenos a{' '}
            <a
              href="mailto:innovanetwork15@gmail.com"
              className="text-[var(--color-bronce)] font-semibold hover:underline"
            >
              innovanetwork15@gmail.com
            </a>{' '}
            o llámanos al{' '}
            <a
              href="tel:+34624065434"
              className="text-[var(--color-bronce)] font-semibold hover:underline"
            >
              +34 624 06 54 34
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
