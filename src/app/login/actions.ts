'use server'

import { createClient } from '@/utils/supabase/server'
import { requireActiveTenantAccess, TenantAccessError } from '@/lib/billing/server'
import { redirect } from 'next/navigation'

async function resolvePostLoginPath(role: string) {
  try {
    await requireActiveTenantAccess()
    return `/${role}`
  } catch (error) {
    if (error instanceof TenantAccessError) return error.redirectTo
    throw error
  }
}

export async function loginWithPin(pin: string, tenantSlug?: string) {
  const supabase = await createClient()

  // We need the Service Role Key to:
  // 1. Bypass RLS to fetch the employee record by PIN (unauthenticated request)
  // 2. Auto-heal: create/update the auth.users record if it doesn't exist yet
  //
  // CRITICAL: SUPABASE_SERVICE_ROLE_KEY must be set in Vercel Environment Variables.
  // Without it, the auto-heal will fail and login will always return "Invalid credentials".
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return { error: 'Error de configuración del servidor: falta SUPABASE_SERVICE_ROLE_KEY.' }
  }

  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  )

  let tenantId: string | undefined
  if (tenantSlug) {
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('slug', tenantSlug)
      .single()

    if (!tenant) return { error: 'No se encontró el negocio solicitado.' }
    tenantId = tenant.id
  }

  // 1. Find the employee by PIN, scoped to the branded tenant when available.
  let employeeQuery = supabaseAdmin
    .from('employees')
    .select('id, rol, activo')
    .eq('pin', pin)
  if (tenantId) employeeQuery = employeeQuery.eq('tenant_id', tenantId)
  const { data: employee } = await employeeQuery.single()

  if (!employee || !employee.activo) {
    return { error: 'PIN inválido o usuario inactivo' }
  }

  if (employee.rol === 'admin') {
    return { error: 'El administrador debe usar su correo y contraseña.' }
  }

  // 2. The internal email is always deterministic: emp_${id}@abaroa.local
  //    We verify against auth to make sure the record exists.
  const email = `emp_${employee.id}@abaroa.local`
  const internalPassword = `${pin}-abaroa-pos`

  // 3. First attempt: direct login
  const { error: firstError } = await supabase.auth.signInWithPassword({ email, password: internalPassword })

  if (!firstError) {
    redirect(await resolvePostLoginPath(employee.rol))
  }

  // 4. Auto-heal: sync the auth.users record (create or update password)
  //    This handles: new employees just added in AdminView, or employees created with old format.
  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(employee.id)

  if (authUser.user) {
    // User exists but password is wrong → update it
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(employee.id, {
      password: internalPassword,
      email, // Ensure email also matches
    })
    if (updateError) return { error: `No se pudo actualizar la cuenta: ${updateError.message}` }
  } else {
    // User does not exist in Auth at all → create it
    const { error: createError } = await supabaseAdmin.auth.admin.createUser({
      id: employee.id,
      email,
      password: internalPassword,
      email_confirm: true,
    })
    if (createError) return { error: `No se pudo crear la cuenta: ${createError.message}` }
  }

  // 5. Retry login after auto-heal
  const { error: retryError } = await supabase.auth.signInWithPassword({ email, password: internalPassword })
  if (retryError) return { error: retryError.message }

  redirect(await resolvePostLoginPath(employee.rol))
}

export async function loginWithEmail(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error, data } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  // Fetch role from employees table
  const { data: employee } = await supabase
    .from('employees')
    .select('rol')
    .eq('id', data.user.id)
    .single()

  if (employee) {
    redirect(await resolvePostLoginPath(employee.rol))
  } else {
    redirect('/')
  }
}
