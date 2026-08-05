import { headers } from 'next/headers'
import { CheckCircle2, Database, Headphones, MessageCircle, ShieldCheck } from 'lucide-react'

import { CommerceShell, TenantIdentity } from '@/components/public/CommerceShell'
import { PaymentPlans } from '@/components/public/PaymentPlans'

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const headersList = await headers()
  const rawName = headersList.get('x-business-name')
  const businessName = rawName ? decodeURIComponent(rawName) : slug
  return { title: `Continúa con Innova Coffee POS | ${businessName}` }
}

const realBenefits = [
  'Punto de venta, productos y categorías.',
  'Mesas, cocina, caja e impresión de tickets.',
  'Inventario, promociones, reportes y cortes.',
  'Soporte para la configuración del negocio.',
]

export default async function VencidoPage({ params }: Props) {
  const { slug } = await params
  const headersList = await headers()
  const rawName = headersList.get('x-business-name')
  const businessName = rawName ? decodeURIComponent(rawName) : slug
  const rawLogo = headersList.get('x-logo-url')
  const logoUrl = rawLogo ? decodeURIComponent(rawLogo) || undefined : undefined

  return (
    <CommerceShell>
      <main className="pt-10 sm:pt-14">
        <section className="mx-auto max-w-3xl text-center" aria-labelledby="expired-heading">
          <TenantIdentity businessName={businessName} logoUrl={logoUrl} />
          <div className="mx-auto mt-7 inline-flex items-center gap-2 rounded-full border border-amber-700/20 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900">
            <CheckCircle2 size={17} /> Tu configuración sigue disponible
          </div>
          <h1 id="expired-heading" className="mt-5 text-3xl font-black tracking-[-.04em] text-stone-950 sm:text-5xl">Tu prueba gratuita ha finalizado</h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-stone-600 sm:text-lg">Elige la modalidad que mejor se adapte a tu negocio para recuperar el acceso. No eliminamos tus datos ni tu configuración al finalizar la prueba.</p>
        </section>

        <section className="mt-10 sm:mt-14" aria-label="Comparación de licencias">
          <PaymentPlans slug={slug} />
        </section>

        <section className="mt-8 grid gap-5 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7 lg:grid-cols-[1.35fr_.65fr]">
          <div>
            <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-stone-100 text-stone-800"><Database size={20} /></span><h2 className="text-xl font-black text-stone-950">Continúa donde te quedaste</h2></div>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {realBenefits.map((benefit) => <li key={benefit} className="flex gap-2 text-sm leading-6 text-stone-700"><CheckCircle2 size={17} className="mt-1 shrink-0 text-emerald-700" />{benefit}</li>)}
            </ul>
          </div>
          <div className="rounded-2xl bg-stone-900 p-5 text-white">
            <Headphones size={23} className="text-amber-300" />
            <h2 className="mt-4 text-lg font-black">¿Quieres que te ayudemos?</h2>
            <p className="mt-2 text-sm leading-6 text-stone-300">Innova Network puede orientarte antes de elegir una licencia.</p>
            <div className="mt-4 space-y-2 text-sm">
              <a href="mailto:innovanetwork15@gmail.com" className="flex min-h-11 items-center font-bold text-amber-300 underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-amber-300">innovanetwork15@gmail.com</a>
              <a href="https://wa.me/34624065434" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 font-bold text-white underline decoration-white/30 underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-white"><MessageCircle size={17} /> +34 624 06 54 34</a>
            </div>
          </div>
        </section>
        <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-stone-500"><ShieldCheck size={15} /> Stripe procesa el pago de forma segura. Innova Network no recibe los datos completos de tu tarjeta.</p>
      </main>
    </CommerceShell>
  )
}
