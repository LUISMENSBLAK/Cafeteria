import { redirect } from 'next/navigation'

import { CommerceShell } from '@/components/public/CommerceShell'
import { PaymentProcessing } from './PaymentProcessing'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ session_id?: string }>
}

export const metadata = { title: 'Confirmando pago | Innova Coffee POS' }

export default async function ProcessingPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { session_id: sessionId } = await searchParams
  if (!sessionId) redirect(`/demo/${slug}/pago/no-completado`)

  return (
    <CommerceShell>
      <main className="mx-auto grid min-h-[calc(100dvh-100px)] max-w-2xl place-items-center py-10">
        <section className="w-full rounded-3xl border border-stone-200 bg-white p-6 shadow-[0_20px_60px_rgba(28,25,23,.10)] sm:p-10">
          <PaymentProcessing sessionId={sessionId} slug={slug} />
        </section>
      </main>
    </CommerceShell>
  )
}

