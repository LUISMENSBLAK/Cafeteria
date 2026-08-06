'use client'

import Image from 'next/image'
import { useState, useTransition } from 'react'
import { Coffee, Delete, Lock, UserCircle } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { loginWithEmail, loginWithPin } from './actions'

interface LoginFormProps {
  businessName: string
  logoUrl?: string
  tenantSlug?: string
}

export function LoginForm({ businessName, logoUrl, tenantSlug }: LoginFormProps) {
  const [isAdminMode, setIsAdminMode] = useState(false)
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const submitPin = (submittedPin: string) => {
    if (submittedPin.length !== 4) return
    setError(null)
    startTransition(async () => {
      const result = await loginWithPin(submittedPin, tenantSlug)
      if (result?.error) {
        setError(result.error)
        setPin('')
      }
    })
  }

  const handleKeypad = (num: string) => {
    if (pin.length >= 4 || isPending) return
    const nextPin = `${pin}${num}`
    setPin(nextPin)
    if (nextPin.length === 4) submitPin(nextPin)
  }

  const handleDelete = () => setPin((current) => current.slice(0, -1))

  const submitEmail = async (formData: FormData) => {
    setError(null)
    startTransition(async () => {
      const result = await loginWithEmail(formData)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="pos-app min-h-screen flex flex-col p-4 bg-[var(--color-crema)]">
      <div className="w-full max-w-md m-auto bg-white rounded-xl overflow-hidden shadow-[0_12px_32px_rgba(58,42,22,0.18),0_2px_8px_rgba(58,42,22,0.10)]">
        <div className="flex items-center justify-center gap-3 border-b border-white/10 bg-stone-900 px-4 py-5 text-left text-white">
          <span className="relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-white p-1 shadow-lg shadow-black/20">
            {logoUrl ? (
              <Image src={logoUrl} alt={`Logo de ${businessName}`} fill sizes="56px" className="object-contain p-1" priority />
            ) : (
              <Coffee size={24} className="text-[var(--color-bronce)]" aria-hidden="true" />
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-extrabold tracking-tight">{businessName}</span>
            <span className="block text-xs text-stone-300">Punto de venta</span>
          </span>
        </div>

        <div className="p-8">
          {error && (
            <div role="alert" className="bg-red-50 text-red-700 p-3 rounded-md text-sm text-center mb-6 border border-red-200">
              {error}
            </div>
          )}

          {!isAdminMode ? (
            <div className="flex flex-col items-center">
              <div className="flex justify-center gap-4 mb-8" aria-label={`${pin.length} de 4 dígitos capturados`}>
                {[...Array(4)].map((_, index) => (
                  <div
                    key={index}
                    className={`w-4 h-4 rounded-full transition-colors duration-200 ${index < pin.length ? 'bg-[var(--color-bronce)]' : 'bg-[var(--color-gris)]/30'}`}
                  />
                ))}
              </div>

              <div className="grid grid-cols-3 gap-4 w-full max-w-[280px]">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <Button key={num} variant="ghost" size="lg" className="h-16 text-2xl font-normal bg-black/5 hover:bg-black/10 rounded-2xl" onClick={() => handleKeypad(String(num))} disabled={isPending}>
                    {num}
                  </Button>
                ))}
                <div />
                <Button variant="ghost" size="lg" className="h-16 text-2xl font-normal bg-black/5 hover:bg-black/10 rounded-2xl" onClick={() => handleKeypad('0')} disabled={isPending}>
                  0
                </Button>
                <Button variant="ghost" size="lg" className="h-16 text-[var(--color-gris)] bg-black/5 hover:bg-black/10 hover:text-red-600 rounded-2xl" onClick={handleDelete} disabled={isPending || pin.length === 0} aria-label="Borrar último dígito">
                  <Delete size={24} />
                </Button>
              </div>
            </div>
          ) : (
            <form action={submitEmail} className="space-y-4">
              {tenantSlug && <input type="hidden" name="tenantSlug" value={tenantSlug} />}
              <div>
                <label className="block text-xs font-bold tracking-widest text-slate-600 uppercase mb-2">Correo</label>
                <Input name="email" type="email" placeholder="admin@tu-cafeteria.com" required disabled={isPending} />
              </div>
              <div>
                <label className="block text-xs font-bold tracking-widest text-slate-600 uppercase mb-2">Contraseña</label>
                <Input name="password" type="password" required disabled={isPending} />
              </div>
              <Button type="submit" className="w-full mt-4" disabled={isPending}>
                {isPending ? 'Iniciando...' : 'Iniciar sesión'}
              </Button>
            </form>
          )}
        </div>

        <div className="p-4 bg-black/5 text-center">
          <button
            type="button"
            onClick={() => {
              setIsAdminMode((current) => !current)
              setPin('')
              setError(null)
            }}
            className="text-xs font-bold tracking-widest text-slate-600 hover:text-[var(--color-bronce)] uppercase transition-colors inline-flex min-h-11 items-center gap-2"
          >
            {isAdminMode ? <><Lock size={14} /> Entrar con PIN</> : <><UserCircle size={14} /> Acceso administrador</>}
          </button>
        </div>
      </div>
    </div>
  )
}
