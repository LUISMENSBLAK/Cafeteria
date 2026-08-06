import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import {
  canTenantAccessPOS,
  getCommercialRedirectPath,
  type CommercialTenant,
} from '@/lib/billing/access'

const PUBLIC_PATHS = ['/', '/login', '/prueba-gratis']

function isPublicExperience(pathname: string) {
  return (
    pathname === '/prueba-gratis' ||
    /^\/demo\/[^/]+\/(login|vencido|regularizar|pago(?:\/|$))/.test(pathname)
  )
}

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return true
  }

  if (isPublicExperience(pathname)) return true

  return (
    pathname === '/api/stripe/webhook' ||
    pathname === '/api/stripe/status' ||
    pathname === '/api/stripe/checkout' ||
    pathname === '/api/stripe/portal' ||
    pathname === '/api/commercial/trial-reminders'
  )
}

function isCommercialRecoveryPath(pathname: string) {
  return /^\/demo\/[^/]+\/(vencido|regularizar|pago(?:\/|$))/.test(pathname)
}

function withRequestHeaders(
  request: NextRequest,
  response: NextResponse,
  headers: Headers,
) {
  const cookies = response.cookies.getAll()
  const nextResponse = NextResponse.next({ request: { headers } })
  cookies.forEach((cookie) => nextResponse.cookies.set(cookie.name, cookie.value, cookie))
  return nextResponse
}

function setPublicExperienceHeader(request: NextRequest, response: NextResponse) {
  if (!isPublicExperience(request.nextUrl.pathname)) return response
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-public-experience', 'true')
  return withRequestHeaders(request, response, requestHeaders)
}

async function injectPublicTenantBrand(
  request: NextRequest,
  response: NextResponse,
  slug: string,
) {
  const supabaseAdmin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => undefined } },
  )

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select(
      'nombre_negocio, theme_color_primario, theme_color_secundario, theme_color_terciario, theme_color_texto, logo_marca_url',
    )
    .eq('slug', slug)
    .single()

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-public-experience', 'true')

  if (tenant) {
    requestHeaders.set('x-business-name', encodeURIComponent(tenant.nombre_negocio))
    requestHeaders.set('x-theme-primario', tenant.theme_color_primario ?? '#F5E6D3')
    requestHeaders.set('x-theme-secundario', tenant.theme_color_secundario ?? '#7A5A32')
    requestHeaders.set('x-theme-terciario', tenant.theme_color_terciario ?? '#8C8880')
    requestHeaders.set('x-theme-texto', tenant.theme_color_texto ?? '#111111')
    requestHeaders.set('x-logo-url', encodeURIComponent(tenant.logo_marca_url ?? ''))
    requestHeaders.set('x-tenant-slug', slug)
  }

  return withRequestHeaders(request, response, requestHeaders)
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const pathname = request.nextUrl.pathname

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    if (!isPublicPath(pathname) && !pathname.startsWith('/_next') && !pathname.includes('.')) {
      const url = request.nextUrl.clone()
      url.pathname = '/prueba-gratis'
      return NextResponse.redirect(url)
    }

    const demoMatch = pathname.match(/^\/demo\/([^/]+)\//)
    if (demoMatch && isPublicExperience(pathname)) {
      return injectPublicTenantBrand(request, supabaseResponse, demoMatch[1])
    }

    if (pathname === '/login') {
      // El tenant debe ser explícito en la URL. No usar una cookie compartida:
      // en dispositivos que prueban varios demos podría mostrar otra marca.
      const tenantSlug = request.nextUrl.searchParams.get('tenant')
      if (tenantSlug) return injectPublicTenantBrand(request, supabaseResponse, tenantSlug)
    }

    return setPublicExperienceHeader(request, supabaseResponse)
  }

  const { data: employee } = await supabase
    .from('employees')
    .select('id, nombre, rol, activo, tenant_id')
    .eq('id', user.id)
    .single()

  if (!employee?.activo) {
    await supabase.auth.signOut()
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  const role = employee.rol
  const tenantId: string | null = employee.tenant_id ?? null
  let businessName = 'POS'
  let themePrimario = '#F5E6D3'
  let themeSecundario = '#7A5A32'
  let themeTerciario = '#8C8880'
  let themeTexto = '#111111'
  let logoUrl = ''
  let tenantSlug = ''
  let trialStatus = ''
  let trialDaysLeft = ''

  if (tenantId) {
    const { data: tenant } = await supabase
      .from('tenants')
      .select(
        'id, slug, nombre_negocio, nombre_contacto, email_contacto, creado_en, trial_started_at, trial_termina_en, billing_status, plan_type, current_period_end, cancel_at_period_end, grace_period_ends_at, access_expires_at, suspended_at, estado, plan, theme_color_primario, theme_color_secundario, theme_color_terciario, theme_color_texto, logo_marca_url',
      )
      .eq('id', tenantId)
      .single()

    if (!tenant) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    businessName = tenant.nombre_negocio
    themePrimario = tenant.theme_color_primario ?? themePrimario
    themeSecundario = tenant.theme_color_secundario ?? themeSecundario
    themeTerciario = tenant.theme_color_terciario ?? themeTerciario
    themeTexto = tenant.theme_color_texto ?? themeTexto
    logoUrl = tenant.logo_marca_url ?? ''
    tenantSlug = tenant.slug

    const commercialTenant = tenant as unknown as CommercialTenant
    const decision = canTenantAccessPOS(commercialTenant)
    trialStatus = decision.effectiveStatus === 'trialing' ? 'trial' : decision.effectiveStatus

    if (decision.effectiveStatus === 'trialing' && tenant.trial_termina_en) {
      const millisecondsLeft = Date.parse(tenant.trial_termina_en) - Date.now()
      trialDaysLeft = String(Math.max(0, Math.ceil(millisecondsLeft / 86_400_000)))
    }

    if (!decision.allowed && !isCommercialRecoveryPath(pathname) && !pathname.startsWith('/api/stripe/')) {
      const url = request.nextUrl.clone()
      url.pathname = getCommercialRedirectPath(commercialTenant, decision)
      url.search = ''
      return NextResponse.redirect(url)
    }
  } else {
    const { data: settings } = await supabase
      .from('settings')
      .select(
        'negocio_nombre, theme_color_primario, theme_color_secundario, theme_color_terciario, theme_color_texto, logo_marca_url',
      )
      .eq('id', 1)
      .single()

    if (settings) {
      businessName = settings.negocio_nombre ?? businessName
      themePrimario = settings.theme_color_primario ?? themePrimario
      themeSecundario = settings.theme_color_secundario ?? themeSecundario
      themeTerciario = settings.theme_color_terciario ?? themeTerciario
      themeTexto = settings.theme_color_texto ?? themeTexto
      logoUrl = settings.logo_marca_url ?? ''
    }
  }

  if (pathname === '/' || pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = `/${role === 'admin' ? 'admin' : role}`
    return NextResponse.redirect(url)
  }

  if (pathname.startsWith('/mesero') && role !== 'mesero' && role !== 'admin') {
    const url = request.nextUrl.clone()
    url.pathname = `/${role}`
    return NextResponse.redirect(url)
  }
  if (pathname.startsWith('/cocina') && role !== 'cocina' && role !== 'admin') {
    const url = request.nextUrl.clone()
    url.pathname = `/${role}`
    return NextResponse.redirect(url)
  }
  if (pathname.startsWith('/caja') && role !== 'caja' && role !== 'admin') {
    const url = request.nextUrl.clone()
    url.pathname = `/${role}`
    return NextResponse.redirect(url)
  }
  if (pathname.startsWith('/admin') && role !== 'admin') {
    const url = request.nextUrl.clone()
    url.pathname = `/${role}`
    return NextResponse.redirect(url)
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-employee-id', employee.id)
  requestHeaders.set('x-employee-rol', employee.rol)
  requestHeaders.set('x-employee-nombre', encodeURIComponent(employee.nombre))
  requestHeaders.set('x-business-name', encodeURIComponent(businessName))
  requestHeaders.set('x-theme-primario', themePrimario)
  requestHeaders.set('x-theme-secundario', themeSecundario)
  requestHeaders.set('x-theme-terciario', themeTerciario)
  requestHeaders.set('x-theme-texto', themeTexto)
  requestHeaders.set('x-logo-url', encodeURIComponent(logoUrl))
  requestHeaders.set('x-tenant-slug', tenantSlug)
  requestHeaders.set('x-trial-status', trialStatus)
  requestHeaders.set('x-trial-days-left', trialDaysLeft)
  if (isPublicExperience(pathname)) requestHeaders.set('x-public-experience', 'true')

  return withRequestHeaders(request, supabaseResponse, requestHeaders)
}
