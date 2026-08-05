import {
  BarChart3,
  Check,
  Coffee,
  Headphones,
  PackageCheck,
  ReceiptText,
  ShieldCheck,
  Store,
  UtensilsCrossed,
} from 'lucide-react'
import Link from 'next/link'

import { TrialForm } from './TrialForm'

export const metadata = {
  title: 'Prueba gratis | Innova Coffee POS',
  description:
    'Prueba Innova Coffee POS durante 14 días. Ventas, mesas, cocina, caja, inventario y reportes para tu cafetería.',
}

const benefits = [
  { icon: UtensilsCrossed, text: 'Ventas, mesas, cocina y caja en un mismo sistema.' },
  { icon: PackageCheck, text: 'Inventario, promociones, reportes y cortes de caja.' },
  { icon: Store, text: 'Configuración inicial automática y acceso inmediato.' },
  { icon: Headphones, text: 'Acompañamiento de Innova Network durante la configuración.' },
]

function ProductPreview() {
  return (
    <div className="relative mt-10 hidden lg:block" aria-hidden="true">
      <div className="absolute -inset-5 rounded-[32px] bg-amber-200/25 blur-3xl" />
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-stone-900 p-3 shadow-[0_28px_70px_rgba(12,10,9,.28)] transition-transform duration-300 hover:-translate-y-1 motion-reduce:transform-none motion-reduce:transition-none">
        <div className="flex items-center justify-between border-b border-white/10 px-3 pb-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Coffee size={17} aria-hidden="true" />
            Innova Coffee POS
          </div>
          <div className="flex gap-1.5">
            <span className="size-2 rounded-full bg-stone-600" />
            <span className="size-2 rounded-full bg-amber-500" />
            <span className="size-2 rounded-full bg-emerald-500" />
          </div>
        </div>
        <div className="grid grid-cols-[1.5fr_.8fr] gap-3 p-3">
          <div>
            <div className="mb-3 flex gap-2">
              {['Café', 'Fríos', 'Comida'].map((label, index) => (
                <span
                  key={label}
                  className={`rounded-md px-2.5 py-1 text-[10px] font-semibold ${
                    index === 0 ? 'bg-amber-600 text-white' : 'bg-white/8 text-stone-300'
                  }`}
                >
                  {label}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                ['Americano', '$35'],
                ['Capuccino', '$55'],
                ['Latte', '$60'],
                ['Frappé', '$75'],
                ['Chilaquiles', '$95'],
                ['Cheesecake', '$70'],
              ].map(([name, price]) => (
                <div key={name} className="rounded-lg border border-white/8 bg-white/[.06] p-2.5">
                  <div className="mb-3 size-5 rounded-md bg-amber-500/20" />
                  <div className="truncate text-[10px] font-medium text-stone-200">{name}</div>
                  <div className="mt-1 text-[10px] font-bold text-amber-400">{price}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl bg-stone-50 p-3 text-stone-900">
            <div className="flex items-center gap-2 text-[11px] font-bold">
              <ReceiptText size={14} /> Orden actual
            </div>
            <div className="my-3 space-y-2">
              <div className="h-2 rounded bg-stone-200" />
              <div className="h-2 w-4/5 rounded bg-stone-200" />
              <div className="h-2 w-3/5 rounded bg-stone-200" />
            </div>
            <div className="flex justify-between border-t border-stone-200 pt-3 text-xs font-bold">
              <span>Total</span><span>$150</span>
            </div>
            <div className="mt-3 rounded-md bg-amber-700 py-2 text-center text-[10px] font-bold text-white">
              Enviar a cocina
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PruebaGratisPage() {
  return (
    <div className="fixed inset-0 overflow-y-auto overscroll-y-auto bg-stone-100 font-[family-name:var(--font-montserrat)] text-stone-950 [scrollbar-gutter:stable]">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-64 bg-amber-100/45 blur-3xl" aria-hidden="true" />
      <main className="relative mx-auto grid min-h-dvh w-full max-w-[1440px] gap-10 px-4 py-5 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,.9fr)_minmax(560px,1.1fr)] lg:gap-14 lg:px-10 lg:py-10 xl:px-16">
        <section className="flex flex-col self-start" aria-labelledby="trial-heading">
          <div>
            <div className="flex items-center justify-between gap-4">
              <Link href="/" className="inline-flex min-h-11 items-center gap-3 rounded-xl text-stone-900 outline-none transition-opacity hover:opacity-75 focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-4">
                <span className="grid size-11 place-items-center rounded-xl bg-stone-900 text-amber-300 shadow-lg shadow-stone-900/15">
                  <Coffee size={22} aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-sm font-extrabold tracking-tight">Innova Coffee POS</span>
                  <span className="block text-xs text-stone-600">Por Innova Network</span>
                </span>
              </Link>
              <span className="hidden items-center gap-1.5 rounded-full border border-emerald-700/20 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 sm:inline-flex">
                <ShieldCheck size={15} aria-hidden="true" /> Sin tarjeta
              </span>
            </div>

            <div className="mt-10 max-w-2xl lg:mt-16">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-700/20 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900 shadow-sm">
                <Check size={16} strokeWidth={2.5} aria-hidden="true" /> 14 días gratis
              </div>
              <h1 id="trial-heading" className="max-w-[16ch] text-4xl font-black leading-[1.08] tracking-[-.045em] text-stone-950 sm:text-5xl lg:text-[3.45rem]">
                Tu cafetería lista para vender mejor desde el primer día.
              </h1>
              <p className="mt-5 max-w-[62ch] text-base leading-7 text-stone-600 sm:text-lg">
                Configura un punto de venta pensado para cafeterías y pequeños restaurantes. Tu espacio, tu identidad y las herramientas operativas en un solo lugar.
              </p>
            </div>

            <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {benefits.map(({ icon: Icon, text }) => (
                <li key={text} className="flex gap-3 rounded-xl border border-stone-200/90 bg-white/75 p-3.5 shadow-[0_8px_24px_rgba(28,25,23,.04)] backdrop-blur-sm transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-amber-700/25 hover:shadow-[0_12px_30px_rgba(28,25,23,.07)] motion-reduce:transform-none motion-reduce:transition-none">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-800">
                    <Icon size={18} aria-hidden="true" />
                  </span>
                  <span className="text-sm font-medium leading-5 text-stone-700">{text}</span>
                </li>
              ))}
            </ul>
          </div>

          <ProductPreview />

          <div className="mt-8 hidden items-center gap-3 text-sm text-stone-600 lg:flex">
            <BarChart3 size={18} className="text-amber-800" aria-hidden="true" />
            <span>Te acompañamos para que la configuración inicial sea clara y rápida.</span>
          </div>
        </section>

        <section id="registro" className="self-start pb-[max(1rem,env(safe-area-inset-bottom))]" aria-label="Registro de prueba gratuita">
          <TrialForm />
          <p className="mt-5 text-center text-sm text-stone-600">
            ¿Ya tienes una cuenta?{' '}
            <a href="/login" className="inline-flex min-h-11 items-center font-bold text-amber-800 underline decoration-amber-800/30 underline-offset-4 outline-none transition-colors hover:text-stone-950 focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2">
              Inicia sesión
            </a>
          </p>
        </section>
      </main>
    </div>
  )
}
