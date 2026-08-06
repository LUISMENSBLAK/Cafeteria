'use client'

interface TrialBannerProps {
  daysLeft: number
  slug: string
}

export function TrialBanner({ daysLeft, slug }: TrialBannerProps) {
  const urgente = daysLeft <= 3
  const mensaje = daysLeft === 0
    ? 'Tu prueba vence hoy'
    : daysLeft === 1
    ? 'Queda 1 día de prueba gratuita'
    : `Quedan ${daysLeft} días de prueba gratuita`

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-2 text-sm font-medium shadow-lg transition-colors ${
        urgente
          ? 'bg-red-600 text-white'
          : 'bg-[var(--color-bronce)] text-[var(--color-en-bronce)]'
      }`}
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
    >
      <span className="flex items-center gap-2">
        <span>{urgente ? '⚠️' : '⏳'}</span>
        <span>{mensaje}</span>
      </span>
      {/* El botón de pago solo es visible para el dueño, que normalmente está en /admin */}
      <a
        href={`/demo/${slug}/vencido`}
        className={`ml-4 rounded px-3 py-1 text-xs font-bold uppercase tracking-wider transition-opacity hover:opacity-80 ${
          urgente
            ? 'bg-white text-red-600'
            : 'bg-[var(--color-crema)] text-[var(--color-en-crema)]'
        }`}
      >
        Actualizar a Pro
      </a>
    </div>
  )
}
