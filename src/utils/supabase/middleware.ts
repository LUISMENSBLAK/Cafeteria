import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Rutas que son completamente públicas (sin requerir autenticación)
const PUBLIC_PATHS = [
  '/login',
  '/prueba-gratis',
]

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) return true
  // Las rutas /demo/[slug]/login y /demo/[slug]/vencido son públicas
  if (pathname.match(/^\/demo\/[^/]+\/(login|vencido)/)) return true
  return false
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // --- Sin sesión ---
  if (!user) {
    if (!isPublicPath(pathname) && !pathname.startsWith('/_next') && !pathname.includes('.')) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    const match = pathname.match(/^\/demo\/([^/]+)\/(login|vencido)/)
    if (match) {
      const slug = match[1]
      const supabaseAdmin = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { cookies: { getAll: () => [], setAll: () => {} } }
      )
      
      const { data: tenant } = await supabaseAdmin
        .from('tenants')
        .select('nombre_negocio, theme_color_primario, theme_color_secundario, theme_color_terciario, theme_color_texto, logo_marca_url')
        .eq('slug', slug)
        .single()
        
      if (tenant) {
        const requestHeaders = new Headers(request.headers)
        requestHeaders.set('x-business-name', encodeURIComponent(tenant.nombre_negocio))
        requestHeaders.set('x-theme-primario', tenant.theme_color_primario ?? '#F5E6D3')
        requestHeaders.set('x-theme-secundario', tenant.theme_color_secundario ?? '#7A5A32')
        requestHeaders.set('x-theme-terciario', tenant.theme_color_terciario ?? '#8C8880')
        requestHeaders.set('x-theme-texto', tenant.theme_color_texto ?? '#111111')
        requestHeaders.set('x-logo-url', encodeURIComponent(tenant.logo_marca_url ?? ''))
        
        supabaseResponse = NextResponse.next({
          request: { headers: requestHeaders },
        })
      }
    }

    return supabaseResponse
  }

  // --- Con sesión: cargar empleado ---
  const { data: employee } = await supabase
    .from('employees')
    .select('id, nombre, rol, activo, tenant_id')
    .eq('id', user.id)
    .single()

  if (!employee || !employee.activo) {
    await supabase.auth.signOut()
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  const role = employee.rol
  const tenantId: string | null = employee.tenant_id ?? null

  // --- Theming & datos de negocio según la fuente correcta ---
  // Para tenants demo: leer de la tabla `tenants`
  // Para instalaciones dedicadas (tenant_id NULL): leer de `settings`
  let businessName = 'POS'
  let themePrimario = '#F5E6D3'
  let themeSecundario = '#7A5A32'
  let themeTerciario = '#8C8880'
  let themeTexto = '#111111'
  let logoUrl = ''
  let tenantSlug = ''
  let trialStatus = '' // 'trial' | 'vencido' | 'activo' | '' (instalación dedicada)
  let trialDaysLeft = ''

  if (tenantId) {
    // Usuario demo: leer de tenants
    const { data: tenant } = await supabase
      .from('tenants')
      .select('slug, nombre_negocio, estado, trial_termina_en, theme_color_primario, theme_color_secundario, theme_color_terciario, theme_color_texto, logo_marca_url')
      .eq('id', tenantId)
      .single()

    if (tenant) {
      businessName = tenant.nombre_negocio
      themePrimario = tenant.theme_color_primario ?? themePrimario
      themeSecundario = tenant.theme_color_secundario ?? themeSecundario
      themeTerciario = tenant.theme_color_terciario ?? themeTerciario
      themeTexto = tenant.theme_color_texto ?? themeTexto
      logoUrl = tenant.logo_marca_url ?? ''
      tenantSlug = tenant.slug

      // Calcular estado del trial (la DB puede tener 'trial' pero la fecha ya pasó)
      const now = new Date()
      const trialEnd = new Date(tenant.trial_termina_en)
      const isExpired = tenant.estado === 'vencido' || (tenant.estado === 'trial' && trialEnd < now)

      if (isExpired) {
        trialStatus = 'vencido'
      } else {
        trialStatus = tenant.estado // 'trial' | 'activo'
      }

      if (trialStatus === 'trial') {
        const msLeft = trialEnd.getTime() - now.getTime()
        const days = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)))
        trialDaysLeft = String(days)
      }

      // Si el trial venció, redirigir a la página de vencimiento (excepto si ya está ahí)
      if (trialStatus === 'vencido' && !pathname.includes('/vencido')) {
        const url = request.nextUrl.clone()
        url.pathname = `/demo/${tenantSlug}/vencido`
        return NextResponse.redirect(url)
      }
    }
  } else {
    // Instalación dedicada: leer de settings (id=1)
    const { data: settings } = await supabase
      .from('settings')
      .select('negocio_nombre, theme_color_primario, theme_color_secundario, theme_color_terciario, theme_color_texto, logo_marca_url')
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

  // --- Redirección por rol ---
  if (pathname === '/' || pathname === '/login') {
    const url = request.nextUrl.clone()
    // Si es demo y ya tiene sesión, mandar a /demo/[slug]/[rol]
    if (tenantSlug) {
      url.pathname = `/demo/${tenantSlug}/${role === 'admin' ? 'admin' : role}`
    } else {
      url.pathname = `/${role}`
    }
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

  // --- Inyectar headers en el REQUEST (no en la response) para que Server Components los lean ---
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

  // Preservar cookies de Supabase auth
  const prevCookies = supabaseResponse.cookies.getAll()

  // CRÍTICO: Los headers van en el request, no en el response,
  // para que los Server Components puedan leerlos con headers() de next/headers
  supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  })

  prevCookies.forEach(cookie => {
    supabaseResponse.cookies.set(cookie.name, cookie.value, cookie)
  })

  return supabaseResponse
}
