'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { loginWithEmail } from '@/app/login/actions'

interface DemoLoginFormProps {
  slug: string
  businessName: string
  logoUrl?: string
}

export function DemoLoginForm({ slug, businessName, logoUrl }: DemoLoginFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const submitEmail = async (formData: FormData) => {
    setError(null)
    startTransition(async () => {
      const res = await loginWithEmail(formData)
      if (res?.error) setError(res.error)
    })
  }

  return (
    <div className="min-h-screen flex flex-col p-4 bg-[var(--color-crema)]">
      <div className="w-full max-w-md m-auto bg-white rounded-xl overflow-hidden shadow-[0_12px_32px_rgba(58,42,22,0.18)]">
        <div className="bg-[var(--color-crema)] py-4 px-4 text-center border-b border-[var(--color-bronce)]/20">
          {logoUrl ? (
            <img src={logoUrl} alt={businessName} className="h-12 mx-auto mb-2 object-contain" />
          ) : (
            <h1 className="text-xl font-bold text-[var(--color-bronce)]">{businessName}</h1>
          )}
          <p className="text-xs text-[var(--color-gris)] mt-1">Sistema Punto de Venta</p>
        </div>

        <div className="p-8">
          <h2 className="text-sm font-bold tracking-widest text-[var(--color-gris)] uppercase text-center mb-6">
            Iniciar Sesión
          </h2>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm text-center mb-6 border border-red-200">
              {error}
            </div>
          )}

          <form action={submitEmail} className="space-y-4">
            <div>
              <label className="block text-xs font-bold tracking-widest text-[var(--color-gris)] uppercase mb-2">
                Correo
              </label>
              <Input name="email" type="email" placeholder="tu@correo.com" required disabled={isPending} />
            </div>
            <div>
              <label className="block text-xs font-bold tracking-widest text-[var(--color-gris)] uppercase mb-2">
                Contraseña
              </label>
              <Input name="password" type="password" required disabled={isPending} />
            </div>
            <Button type="submit" className="w-full mt-4" disabled={isPending}>
              {isPending ? 'Iniciando...' : 'Entrar al POS'}
            </Button>
          </form>
        </div>

        <div className="p-4 bg-black/5 text-center">
          <p className="text-xs text-[var(--color-gris)]">
            ¿Problemas para entrar?{' '}
            <a
              href="mailto:innovanetwork15@gmail.com"
              className="text-[var(--color-bronce)] font-semibold hover:underline"
            >
              Contáctanos
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
