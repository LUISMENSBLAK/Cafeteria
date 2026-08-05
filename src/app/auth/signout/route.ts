import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const formData = await request.formData()
  const requestedSlug = String(formData.get('tenantSlug') ?? '').trim()

  const { data: { user } } = await supabase.auth.getUser()
  let tenantSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(requestedSlug) ? requestedSlug : ''

  if (user) {
    const { data: employee } = await supabase
      .from('employees')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (employee?.tenant_id) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('slug')
        .eq('id', employee.tenant_id)
        .single()
      tenantSlug = tenant?.slug ?? tenantSlug
    }
  }

  const { error } = await supabase.auth.signOut()

  if (error) {
    return NextResponse.redirect(new URL('/', request.url), {
      status: 302,
    })
  }

  revalidatePath('/', 'layout')
  const target = new URL('/login', request.url)
  if (tenantSlug) target.searchParams.set('tenant', tenantSlug)
  const response = NextResponse.redirect(target, {
    status: 302,
  })
  // Borra la identidad persistida por versiones anteriores; la URL contiene
  // ahora el tenant exacto y es la única fuente para pintar la marca.
  response.cookies.delete('innova-tenant-slug')
  return response
}
