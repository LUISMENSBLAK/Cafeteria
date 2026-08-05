'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import {
  AlertCircle,
  ArrowRight,
  Coffee,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from 'lucide-react'

import { loginWithEmail } from '@/app/login/actions'

interface DemoLoginFormProps {
  slug: string
  businessName: string
  logoUrl?: string
  accentTextColor: string
}

const inputClass =
  'h-12 w-full rounded-xl border border-stone-300 bg-white px-4 text-base text-stone-950 outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-stone-400 hover:border-stone-400 focus:border-[var(--color-bronce)] focus:ring-4 focus:ring-[var(--color-bronce)]/15 disabled:cursor-not-allowed disabled:bg-stone-100 motion-reduce:transition-none'

export function DemoLoginForm({
  slug,
  businessName,
  logoUrl,
  accentTextColor,
}: DemoLoginFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [isPending, startTransition] = useTransition()
  const errorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (error) errorRef.current?.focus()
  }, [error])

  const submitEmail = async (formData: FormData) => {
    if (isPending) return
    setError(null)
    startTransition(async () => {
      const result = await loginWithEmail(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="fixed inset-0 overflow-y-auto overscroll-y-auto bg-[var(--color-crema)] font-[family-name:var(--font-montserrat)] [scrollbar-gutter:stable]">
      <div className="pointer-events-none fixed -left-24 top-1/4 size-72 rounded-full bg-[var(--color-bronce)] opacity-[.08] blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none fixed -right-24 bottom-1/4 size-72 rounded-full bg-[var(--color-bronce)] opacity-[.08] blur-3xl" aria-hidden="true" />
      <main className="relative grid min-h-dvh place-items-center px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-10">
        <div className="w-full max-w-md">
          <div className="mb-5 flex items-center justify-center gap-2 text-xs font-bold text-[var(--color-negro)] opacity-75">
            <ShieldCheck size={16} aria-hidden="true" /> Acceso seguro al punto de venta
          </div>
          <section className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-[0_28px_80px_rgba(12,10,9,.18),0_2px_10px_rgba(12,10,9,.07)]" aria-labelledby="login-heading">
            <div className="relative border-b border-stone-200 bg-stone-50 px-5 pb-6 pt-7 text-center sm:px-8 sm:pt-8">
              <div className="absolute inset-x-0 top-0 h-1.5 bg-[var(--color-bronce)]" />
              <div className="mx-auto grid h-20 w-full max-w-[260px] place-items-center rounded-2xl border border-stone-200 bg-white px-5 shadow-sm">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt={`Logo de ${businessName}`} className="max-h-14 max-w-full object-contain" />
                ) : (
                  <Coffee size={38} className="text-[var(--color-bronce)]" aria-hidden="true" />
                )}
              </div>
              <h1 className="mt-4 break-words text-xl font-black tracking-[-.025em] text-stone-950 sm:text-2xl">{businessName}</h1>
              <p className="mt-1 text-sm font-medium text-stone-500">Sistema Punto de Venta</p>
            </div>

            <div className="p-5 sm:p-8">
              <div className="mb-6">
                <h2 id="login-heading" className="text-2xl font-black tracking-[-.03em] text-stone-950">Inicia sesión</h2>
                <p className="mt-2 text-sm leading-6 text-stone-600">Usa el correo y la contraseña asociados a este negocio.</p>
              </div>

              {error && (
                <div ref={errorRef} tabIndex={-1} role="alert" className="mb-5 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm leading-5 text-red-900 outline-none focus:ring-2 focus:ring-red-700">
                  <AlertCircle size={19} className="mt-0.5 shrink-0" aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}

              <form action={submitEmail} className="space-y-5">
                <input type="hidden" name="tenantSlug" value={slug} />
                <div>
                  <label htmlFor="demo-email" className="text-sm font-bold text-stone-800">Correo electrónico</label>
                  <div className="relative mt-2">
                    <Mail size={18} className="pointer-events-none absolute left-4 top-3.5 text-stone-400" aria-hidden="true" />
                    <input id="demo-email" name="email" type="email" required autoComplete="email" inputMode="email" placeholder="tu@cafeteria.com" disabled={isPending} className={`${inputClass} pl-11`} />
                  </div>
                </div>
                <div>
                  <label htmlFor="demo-password" className="text-sm font-bold text-stone-800">Contraseña</label>
                  <div className="relative mt-2">
                    <LockKeyhole size={18} className="pointer-events-none absolute left-4 top-3.5 text-stone-400" aria-hidden="true" />
                    <input id="demo-password" name="password" type={showPassword ? 'text' : 'password'} required autoComplete="current-password" disabled={isPending} className={`${inputClass} px-11`} />
                    <button type="button" onClick={() => setShowPassword((visible) => !visible)} disabled={isPending} className="absolute right-0 top-0 grid size-12 cursor-pointer place-items-center rounded-xl text-stone-500 outline-none transition-colors hover:text-stone-950 focus-visible:ring-2 focus-visible:ring-[var(--color-bronce)] disabled:cursor-not-allowed" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                      {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={isPending} style={{ color: accentTextColor }} className="inline-flex min-h-13 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--color-bronce)] px-5 text-sm font-extrabold shadow-[0_12px_28px_rgba(0,0,0,.16)] outline-none transition-[filter,transform,box-shadow] duration-200 hover:brightness-90 hover:shadow-[0_15px_32px_rgba(0,0,0,.20)] active:scale-[.98] focus-visible:ring-4 focus-visible:ring-[var(--color-bronce)]/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none motion-reduce:transform-none motion-reduce:transition-none">
                  {isPending ? <><LoaderCircle size={19} className="animate-spin motion-reduce:animate-none" />Verificando acceso…</> : <>Entrar al POS <ArrowRight size={19} /></>}
                </button>
              </form>
            </div>

            <div className="border-t border-stone-200 bg-stone-50 px-5 py-4 text-center text-xs leading-5 text-stone-600 sm:px-8">
              ¿Problemas para entrar?{' '}
              <a href="mailto:innovanetwork15@gmail.com" className="inline-flex min-h-11 items-center font-bold text-stone-900 underline decoration-[var(--color-bronce)] underline-offset-4 outline-none hover:text-[var(--color-bronce)] focus-visible:ring-2 focus-visible:ring-[var(--color-bronce)]">
                Habla con soporte
              </a>
            </div>
          </section>
          <p className="mt-5 text-center text-xs font-medium text-[var(--color-negro)] opacity-70">Tecnología de Innova Network</p>
        </div>
      </main>
    </div>
  )
}
