import { ArrowLeft, CircleX, Headphones } from 'lucide-react'

import { CommerceShell } from '@/components/public/CommerceShell'
import { PaymentPlans } from '@/components/public/PaymentPlans'

interface Props { params: Promise<{ slug: string }> }

export const metadata = { title: 'Pago no completado | Innova Coffee POS' }

export default async function PaymentNotCompletedPage({ params }: Props) {
  const { slug } = await params
  return (
    <CommerceShell>
      <main className="py-10 sm:py-14">
        <section className="mx-auto max-w-2xl text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-stone-200 text-stone-700"><CircleX size={33} /></div>
          <h1 className="mt-5 text-3xl font-black tracking-[-.04em] text-stone-950 sm:text-4xl">El pago no se completó</h1>
          <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-stone-600">No hicimos cambios en tu acceso. Puedes revisar las opciones e intentarlo nuevamente cuando estés listo.</p>
          <a href={`/demo/${slug}/vencido`} className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-amber-800 underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-amber-700"><ArrowLeft size={17} /> Volver a la comparación</a>
        </section>
        <section className="mt-10"><PaymentPlans slug={slug} /></section>
        <div className="mx-auto mt-7 flex max-w-2xl items-start gap-3 rounded-2xl border border-stone-200 bg-white p-4 text-sm leading-6 text-stone-600"><Headphones size={20} className="mt-0.5 shrink-0 text-amber-800" /><span>Si Stripe mostró un cobro pero esta pantalla indica lo contrario, no repitas el pago: contáctanos en <a href="mailto:innovanetwork15@gmail.com" className="font-bold text-stone-900 underline">innovanetwork15@gmail.com</a> para revisarlo.</span></div>
      </main>
    </CommerceShell>
  )
}

