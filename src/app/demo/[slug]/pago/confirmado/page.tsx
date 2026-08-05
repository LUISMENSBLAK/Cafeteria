import { redirect } from 'next/navigation'
import { ArrowRight, BadgeCheck, Check, Database, ReceiptText } from 'lucide-react'

import { canTenantAccessPOS, type CommercialTenant } from '@/lib/billing/access'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe/server'
import { createClient } from '@/utils/supabase/server'
import { CommerceShell, TenantIdentity } from '@/components/public/CommerceShell'

type ConfirmedTenant = CommercialTenant & {
  logo_marca_url: string | null
  last_payment_reference: string | null
}

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ session_id?: string }>
}

function formatAmount(amount: number | null) {
  if (amount === null) return 'Confirmado en Stripe'
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(amount / 100)
}

export const metadata = { title: 'Pago confirmado | Innova Coffee POS' }

export default async function ConfirmedPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { session_id: sessionId } = await searchParams
  if (!sessionId) redirect(`/demo/${slug}/pago/no-completado`)

  let session
  try {
    session = await getStripe().checkout.sessions.retrieve(sessionId)
  } catch {
    redirect(`/demo/${slug}/pago/no-completado`)
  }

  if (session.metadata?.slug !== slug || !session.metadata.tenant_id) {
    redirect(`/demo/${slug}/pago/no-completado`)
  }

  const admin = createAdminClient()
  const { data: tenant } = await admin
    .from('tenants')
    .select('id, slug, nombre_negocio, nombre_contacto, email_contacto, creado_en, trial_started_at, trial_termina_en, billing_status, plan_type, current_period_end, cancel_at_period_end, grace_period_ends_at, access_expires_at, suspended_at, estado, plan, logo_marca_url, last_payment_reference')
    .eq('id', session.metadata.tenant_id)
    .single()
  if (!tenant) redirect(`/demo/${slug}/pago/no-completado`)

  const typedTenant = tenant as unknown as ConfirmedTenant
  const decision = canTenantAccessPOS(typedTenant)
  const planMatches =
    (session.metadata.plan === 'unico' && typedTenant.plan_type === 'one_time') ||
    (session.metadata.plan === 'mensual' && typedTenant.plan_type === 'monthly')
  if (
    !decision.allowed ||
    !['active', 'canceled'].includes(typedTenant.billing_status ?? '') ||
    !planMatches
  ) {
    redirect(`/demo/${slug}/pago/procesando?session_id=${encodeURIComponent(sessionId)}`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let posUrl = `/demo/${slug}/login`
  if (user) {
    const { data: employee } = await admin.from('employees').select('rol, tenant_id').eq('id', user.id).single()
    if (employee && employee.tenant_id === typedTenant.id) posUrl = `/${employee.rol}`
  }

  const planLabel = typedTenant.plan_type === 'one_time' ? 'Licencia de pago único' : 'Plan con mensualidad'

  return (
    <CommerceShell>
      <main className="mx-auto max-w-3xl py-10 sm:py-14">
        <section className="overflow-hidden rounded-3xl border border-emerald-900/10 bg-white shadow-[0_22px_70px_rgba(28,25,23,.11)]">
          <div className="h-1.5 bg-emerald-600" />
          <div className="p-6 sm:p-10">
            <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-emerald-100 text-emerald-800"><BadgeCheck size={34} /></div>
            <div className="mt-6"><TenantIdentity businessName={typedTenant.nombre_negocio} logoUrl={typedTenant.logo_marca_url ?? undefined} /></div>
            <h1 className="mt-7 text-center text-3xl font-black tracking-[-.04em] text-stone-950 sm:text-4xl">Tu acceso está activo</h1>
            <p className="mx-auto mt-3 max-w-xl text-center text-base leading-7 text-stone-600">Confirmamos el pago con Stripe. Tus datos y configuración continúan disponibles para seguir trabajando.</p>

            <dl className="mt-8 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-4"><dt className="flex items-center gap-2 text-xs font-bold text-stone-500"><ReceiptText size={15} /> Plan</dt><dd className="mt-2 text-sm font-black text-stone-900">{planLabel}</dd></div>
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-4"><dt className="text-xs font-bold text-stone-500">Importe confirmado</dt><dd className="mt-2 text-sm font-black text-stone-900 tabular-nums">{formatAmount(session.amount_total)}</dd></div>
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-4"><dt className="text-xs font-bold text-stone-500">Estado</dt><dd className="mt-2 flex items-center gap-2 text-sm font-black text-emerald-800"><Check size={16} /> Activo</dd></div>
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-4"><dt className="text-xs font-bold text-stone-500">Referencia</dt><dd className="mt-2 break-all font-mono text-xs font-bold text-stone-900">{typedTenant.last_payment_reference || session.id}</dd></div>
            </dl>

            <div className="mt-6 flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-950"><Database size={19} className="mt-0.5 shrink-0" /><span>No necesitas volver a configurar productos, mesas ni preferencias del negocio.</span></div>
            <a href={posUrl} className="mt-6 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-stone-900 px-5 text-sm font-extrabold text-white shadow-lg shadow-stone-900/15 outline-none transition-[background-color,transform] hover:bg-amber-800 active:scale-[.98] focus-visible:ring-4 focus-visible:ring-amber-700/25 motion-reduce:transform-none">Entrar a mi punto de venta <ArrowRight size={19} /></a>
            <p className="mt-5 text-center text-xs leading-5 text-stone-500">También enviamos la confirmación a {typedTenant.email_contacto}. Si necesitas ayuda, escribe a innovanetwork15@gmail.com.</p>
          </div>
        </section>
      </main>
    </CommerceShell>
  )
}
