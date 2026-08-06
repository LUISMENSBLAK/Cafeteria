import { ArrowRight, BadgeCheck, Check, CreditCard, Infinity, ReceiptText } from 'lucide-react'

import { MONTHLY_RECURRING_AMOUNT_CENTS, MONTHLY_SETUP_AMOUNT_CENTS } from '@/lib/billing/pricing'

const money = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
})

const monthlySetupAmount = money.format(MONTHLY_SETUP_AMOUNT_CENTS / 100)
const monthlyRecurringAmount = money.format(MONTHLY_RECURRING_AMOUNT_CENTS / 100)

const oneTimeBenefits = [
  'Un solo pago para ese negocio.',
  'Sin mensualidades posteriores.',
  'Licencia permanente conforme a las condiciones del servicio.',
]

const monthlyBenefits = [
  'El pago inicial cubre instalación y activación.',
  'La primera mensualidad se cobra hasta el siguiente mes.',
  'Mensualidad administrada de forma segura con Stripe.',
]

function CheckoutForm({ slug, plan, label, primary = false }: { slug: string; plan: 'unico' | 'mensual'; label: string; primary?: boolean }) {
  return (
    <form action="/api/stripe/checkout" method="post">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="plan" value={plan} />
      <button type="submit" className={`inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-5 text-sm font-extrabold outline-none transition-[background-color,border-color,box-shadow,transform] duration-200 active:scale-[.98] focus-visible:ring-4 focus-visible:ring-amber-700/25 motion-reduce:transform-none motion-reduce:transition-none ${primary ? 'bg-stone-900 text-white shadow-[0_12px_28px_rgba(28,25,23,.18)] hover:bg-amber-800 hover:shadow-amber-900/20' : 'border border-stone-300 bg-white text-stone-900 hover:border-amber-700 hover:bg-amber-50'}`}>
        {label} <ArrowRight size={18} aria-hidden="true" />
      </button>
    </form>
  )
}

export function PaymentPlans({ slug }: { slug: string }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <article className="relative flex flex-col rounded-3xl border-2 border-amber-700 bg-white p-5 shadow-[0_20px_55px_rgba(133,77,14,.12)] transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[0_24px_65px_rgba(133,77,14,.16)] motion-reduce:transform-none motion-reduce:transition-none sm:p-7">
        <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-900">
          <BadgeCheck size={15} aria-hidden="true" /> Mejor valor
        </span>
        <div className="grid size-12 place-items-center rounded-xl bg-stone-900 text-amber-300"><Infinity size={24} /></div>
        <p className="mt-5 text-sm font-bold text-amber-800">Compra definitiva</p>
        <h2 className="mt-2 text-2xl font-black text-stone-950">Licencia de pago único</h2>
        <div className="mt-5 flex flex-wrap items-end gap-x-2 gap-y-1">
          <span className="text-4xl font-black tracking-[-.045em] text-stone-950 tabular-nums">$5,000</span>
          <span className="pb-1 text-sm font-bold text-stone-500">MXN · una sola vez</span>
        </div>
        <div className="mt-4 inline-flex w-fit items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800"><Check size={16} /> Sin mensualidades</div>
        <ul className="my-6 space-y-3 text-sm leading-6 text-stone-700">
          {oneTimeBenefits.map((benefit) => <li key={benefit} className="flex gap-3"><Check size={17} className="mt-1 shrink-0 text-emerald-700" /><span>{benefit}</span></li>)}
        </ul>
        <div className="mt-auto"><CheckoutForm slug={slug} plan="unico" label="Comprar licencia definitiva" primary /></div>
      </article>

      <article className="flex flex-col rounded-3xl border border-stone-200 bg-white p-5 shadow-[0_16px_45px_rgba(28,25,23,.08)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:border-stone-300 hover:shadow-[0_22px_55px_rgba(28,25,23,.11)] motion-reduce:transform-none motion-reduce:transition-none sm:p-7">
        <div className="grid size-12 place-items-center rounded-xl bg-stone-100 text-stone-800"><CreditCard size={24} /></div>
        <p className="mt-5 text-sm font-bold text-stone-600">Opción flexible</p>
        <h2 className="mt-2 text-2xl font-black text-stone-950">Plan con mensualidad</h2>
        <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 p-4">
          <div className="flex items-start gap-3">
            <ReceiptText size={21} className="mt-1 shrink-0 text-amber-800" />
            <div>
              <p className="text-2xl font-black tracking-[-.035em] text-stone-950 tabular-nums">{monthlySetupAmount} MXN hoy</p>
              <p className="mt-1 text-base font-black text-amber-800 tabular-nums">Después, {monthlyRecurringAmount} MXN al mes</p>
            </div>
          </div>
        </div>
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold leading-6 text-amber-950">
          Hoy pagas únicamente {monthlySetupAmount} MXN. No cobramos la mensualidad de {monthlyRecurringAmount} MXN en esta compra; comienza un mes después.
        </p>
        <ul className="my-6 space-y-3 text-sm leading-6 text-stone-700">
          {monthlyBenefits.map((benefit) => <li key={benefit} className="flex gap-3"><Check size={17} className="mt-1 shrink-0 text-amber-700" /><span>{benefit}</span></li>)}
        </ul>
        <div className="mt-auto"><CheckoutForm slug={slug} plan="mensual" label={`Pagar ${monthlySetupAmount} MXN`} /></div>
      </article>
    </div>
  )
}
