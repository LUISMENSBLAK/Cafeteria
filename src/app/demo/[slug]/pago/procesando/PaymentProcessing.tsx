'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Clock3, LoaderCircle, RefreshCw, ShieldCheck } from 'lucide-react'

type PaymentState = 'polling' | 'waiting' | 'invalid'

export function PaymentProcessing({ sessionId, slug }: { sessionId: string; slug: string }) {
  const router = useRouter()
  const [state, setState] = useState<PaymentState>('polling')

  useEffect(() => {
    let canceled = false
    let attempts = 0
    let timeout: ReturnType<typeof setTimeout> | undefined

    const checkStatus = async () => {
      attempts += 1
      try {
        const response = await fetch(`/api/stripe/status?session_id=${encodeURIComponent(sessionId)}`, {
          cache: 'no-store',
        })
        const data = (await response.json()) as { state?: string }
        if (canceled) return
        if (data.state === 'confirmed') {
          router.replace(`/demo/${encodeURIComponent(slug)}/pago/confirmado?session_id=${encodeURIComponent(sessionId)}`)
          return
        }
        if (data.state === 'invalid' || data.state === 'failed') {
          setState('invalid')
          return
        }
      } catch {
        // Un fallo temporal de red se vuelve a intentar dentro del límite.
      }

      if (attempts >= 15) {
        setState('waiting')
        return
      }
      timeout = setTimeout(checkStatus, 2000)
    }

    void checkStatus()
    return () => {
      canceled = true
      if (timeout) clearTimeout(timeout)
    }
  }, [router, sessionId, slug])

  if (state === 'invalid') {
    return (
      <div className="text-center" role="alert">
        <Clock3 size={38} className="mx-auto text-amber-800" />
        <h1 className="mt-5 text-3xl font-black tracking-[-.035em] text-stone-950">No pudimos validar esta operación</h1>
        <p className="mt-3 text-base leading-7 text-stone-600">Tu acceso no cambió. Puedes volver a las opciones de pago e intentarlo nuevamente.</p>
        <a href={`/demo/${slug}/pago/no-completado`} className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-stone-900 px-5 text-sm font-bold text-white outline-none hover:bg-amber-800 focus-visible:ring-4 focus-visible:ring-amber-700/25">Volver a opciones de pago</a>
      </div>
    )
  }

  return (
    <div className="text-center" aria-live="polite">
      <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-amber-100 text-amber-800">
        {state === 'polling' ? <LoaderCircle size={32} className="animate-spin motion-reduce:animate-none" /> : <Clock3 size={32} />}
      </div>
      <h1 className="mt-5 text-3xl font-black tracking-[-.035em] text-stone-950">Estamos confirmando tu pago</h1>
      <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-stone-600">Stripe ya procesó la operación. Estamos activando tu punto de venta y normalmente solo tarda unos segundos.</p>
      <div className="mx-auto mt-6 flex max-w-md items-start gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4 text-left text-sm leading-6 text-stone-600">
        <ShieldCheck size={19} className="mt-0.5 shrink-0 text-emerald-700" />
        <span>Esta pantalla no activa la cuenta por sí sola. Esperamos la confirmación firmada de Stripe.</span>
      </div>
      {state === 'waiting' && (
        <div className="mt-6">
          <p className="text-sm text-stone-600">La confirmación está tardando un poco más de lo habitual.</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-3 inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border border-stone-300 bg-white px-5 text-sm font-bold text-stone-900 outline-none hover:border-amber-700 hover:bg-amber-50 focus-visible:ring-4 focus-visible:ring-amber-700/20">
            <RefreshCw size={17} /> Volver a comprobar
          </button>
        </div>
      )}
    </div>
  )
}

