import { Coffee, ShieldCheck } from 'lucide-react'
import Link from 'next/link'

export function CommerceShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 overflow-y-auto overscroll-y-auto bg-stone-100 font-[family-name:var(--font-montserrat)] text-stone-950 [scrollbar-gutter:stable]">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-72 bg-amber-100/50 blur-3xl" aria-hidden="true" />
      <div className="relative mx-auto min-h-dvh w-full max-w-6xl px-4 py-5 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-8 lg:px-8">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex min-h-11 items-center gap-3 rounded-xl outline-none transition-opacity hover:opacity-75 focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-4">
            <span className="grid size-11 place-items-center rounded-xl bg-stone-900 text-amber-300 shadow-lg shadow-stone-900/15">
              <Coffee size={22} aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm font-extrabold">Innova Coffee POS</span>
              <span className="block text-xs text-stone-600">Por Innova Network</span>
            </span>
          </Link>
          <span className="hidden items-center gap-2 text-xs font-bold text-stone-600 sm:flex">
            <ShieldCheck size={16} className="text-emerald-700" aria-hidden="true" /> Pagos seguros con Stripe
          </span>
        </header>
        {children}
      </div>
    </div>
  )
}

export function TenantIdentity({
  businessName,
  logoUrl,
}: {
  businessName: string
  logoUrl?: string
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="grid h-20 w-full max-w-[280px] place-items-center rounded-2xl border border-stone-200 bg-white px-5 shadow-sm">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={`Logo de ${businessName}`} className="max-h-14 max-w-full object-contain" />
        ) : (
          <Coffee size={38} className="text-amber-800" aria-hidden="true" />
        )}
      </div>
      <p className="mt-4 max-w-full break-words text-xl font-black tracking-[-.025em] text-stone-950 sm:text-2xl">{businessName}</p>
      <p className="mt-1 text-sm text-stone-500">Sistema Punto de Venta</p>
    </div>
  )
}
