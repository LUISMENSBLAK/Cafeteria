import { NextRequest, NextResponse } from 'next/server'

import { canTenantAccessPOS, type CommercialTenant } from '@/lib/billing/access'
import { COMMERCIAL_TENANT_SELECT } from '@/lib/billing/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe/server'

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('session_id')
  if (!sessionId || !sessionId.startsWith('cs_')) {
    return NextResponse.json({ state: 'invalid' }, { status: 400 })
  }

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId)
    const tenantId = session.metadata?.tenant_id
    const plan = session.metadata?.plan
    if (!tenantId || (plan !== 'unico' && plan !== 'mensual')) {
      return NextResponse.json({ state: 'invalid' }, { status: 404 })
    }

    const { data: tenant } = await createAdminClient()
      .from('tenants')
      .select(COMMERCIAL_TENANT_SELECT)
      .eq('id', tenantId)
      .single()
    if (!tenant) return NextResponse.json({ state: 'invalid' }, { status: 404 })

    const typedTenant = tenant as unknown as CommercialTenant
    const decision = canTenantAccessPOS(typedTenant)
    const isPaidPlanActive =
      decision.allowed &&
      (typedTenant.billing_status === 'active' || typedTenant.billing_status === 'canceled') &&
      typedTenant.plan_type === (plan === 'unico' ? 'one_time' : 'monthly')

    return NextResponse.json(
      {
        state: isPaidPlanActive
          ? 'confirmed'
          : session.status === 'expired'
            ? 'failed'
            : 'processing',
        slug: typedTenant.slug,
        businessName: typedTenant.nombre_negocio,
        plan,
        amountTotal: session.amount_total,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch {
    return NextResponse.json({ state: 'invalid' }, { status: 404 })
  }
}
