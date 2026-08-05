import { NextRequest, NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe/server'
import { createClient } from '@/utils/supabase/server'

function appBaseUrl() {
  return (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
}

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const slug = String(formData.get('slug') || '')
  if (!slug) return NextResponse.json({ error: 'Solicitud no válida.' }, { status: 400 })

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${appBaseUrl()}/demo/${encodeURIComponent(slug)}/login`, 303)
  }

  try {
    const admin = createAdminClient()
    const { data: employee } = await admin
      .from('employees')
      .select('tenant_id, activo')
      .eq('id', user.id)
      .single()
    if (!employee?.activo || !employee.tenant_id) throw new Error('UNAUTHORIZED')

    const { data: tenant } = await admin
      .from('tenants')
      .select('id, stripe_customer_id')
      .eq('id', employee.tenant_id)
      .eq('slug', slug)
      .single()
    if (!tenant?.stripe_customer_id) throw new Error('NO_CUSTOMER')

    const portal = await getStripe().billingPortal.sessions.create({
      customer: tenant.stripe_customer_id,
      return_url: `${appBaseUrl()}/demo/${encodeURIComponent(slug)}/regularizar`,
      ...(process.env.STRIPE_CUSTOMER_PORTAL_CONFIGURATION_ID
        ? { configuration: process.env.STRIPE_CUSTOMER_PORTAL_CONFIGURATION_ID }
        : {}),
    })
    return NextResponse.redirect(portal.url, 303)
  } catch (error) {
    console.error('Stripe portal error:', error instanceof Error ? error.message : 'unknown')
    return NextResponse.redirect(
      `${appBaseUrl()}/demo/${encodeURIComponent(slug)}/regularizar?error=portal`,
      303,
    )
  }
}

