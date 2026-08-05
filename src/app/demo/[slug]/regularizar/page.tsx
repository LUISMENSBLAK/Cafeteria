import { headers } from 'next/headers'
import { AlertCircle, ArrowRight, CreditCard, ShieldCheck } from 'lucide-react'

import { CommerceShell, TenantIdentity } from '@/components/public/CommerceShell'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ error?: string }>
}

export const metadata = { title: 'Regularizar mensualidad | Innova Coffee POS' }

export default async function RegularizePage({ params, searchParams }: Props) {
  const { slug } = await params
  const { error } = await searchParams
  const headersList = await headers()
  const rawName = headersList.get('x-business-name')
  const businessName = rawName ? decodeURIComponent(rawName) : slug
  const rawLogo = headersList.get('x-logo-url')
  const logoUrl = rawLogo ? decodeURIComponent(rawLogo) || undefined : undefined

  return (
    <CommerceShell>
      <main className="mx-auto max-w-2xl py-10 sm:py-14">
        <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-[0_20px_60px_rgba(28,25,23,.10)] sm:p-9">
          <TenantIdentity businessName={businessName} logoUrl={logoUrl} />
          <div className="mx-auto mt-7 grid size-14 place-items-center rounded-2xl bg-amber-100 text-amber-800"><CreditCard size={28} /></div>
          <h1 className="mt-5 text-center text-3xl font-black tracking-[-.035em] text-stone-950">Tu mensualidad necesita atención</h1>
          <p className="mt-3 text-center text-base leading-7 text-stone-600">Stripe no pudo confirmar un cobro. Usa el portal seguro para actualizar tu método de pago o revisar la factura pendiente.</p>
          {error && <div role="alert" className="mt-5 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"><AlertCircle size={19} className="shrink-0" />No pudimos abrir el portal. Intenta nuevamente o contacta a soporte.</div>}
          <form action="/api/stripe/portal" method="post" className="mt-7">
            <input type="hidden" name="slug" value={slug} />
            <button type="submit" className="inline-flex min-h-13 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-stone-900 px-5 text-sm font-extrabold text-white shadow-lg shadow-stone-900/15 outline-none transition-[background-color,transform] hover:bg-amber-800 active:scale-[.98] focus-visible:ring-4 focus-visible:ring-amber-700/25 motion-reduce:transform-none"><ShieldCheck size={19} /> Abrir portal seguro de Stripe <ArrowRight size={18} /></button>
          </form>
          <p className="mt-4 text-center text-xs leading-5 text-stone-500">Innova Network no captura ni almacena los datos completos de tu tarjeta.</p>
          <div className="mt-7 border-t border-stone-200 pt-6 text-center">
            <p className="text-sm text-stone-600">¿Prefieres cambiar de modalidad?</p>
            <a href={`/demo/${slug}/vencido`} className="mt-2 inline-flex min-h-11 items-center font-bold text-amber-800 underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-amber-700">Ver todas las licencias</a>
          </div>
        </section>
      </main>
    </CommerceShell>
  )
}
