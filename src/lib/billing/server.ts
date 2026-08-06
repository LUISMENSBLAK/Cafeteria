import { createClient } from '@/utils/supabase/server'
import {
  canTenantAccessPOS,
  getCommercialRedirectPath,
  type CommercialTenant,
  type TenantAccessDecision,
} from './access'

export const COMMERCIAL_TENANT_SELECT = [
  'id',
  'slug',
  'nombre_negocio',
  'nombre_contacto',
  'email_contacto',
  'creado_en',
  'trial_started_at',
  'trial_termina_en',
  'billing_status',
  'plan_type',
  'current_period_end',
  'cancel_at_period_end',
  'grace_period_ends_at',
  'access_expires_at',
  'suspended_at',
  'estado',
  'plan',
].join(',')

export type TenantAccessErrorCode =
  | 'UNAUTHENTICATED'
  | 'EMPLOYEE_INACTIVE'
  | 'FORBIDDEN_ROLE'
  | 'TENANT_NOT_FOUND'
  | 'TENANT_ACCESS_EXPIRED'

export class TenantAccessError extends Error {
  readonly code: TenantAccessErrorCode
  readonly redirectTo: string

  constructor(code: TenantAccessErrorCode, redirectTo: string) {
    super(code)
    this.name = 'TenantAccessError'
    this.code = code
    this.redirectTo = redirectTo
  }
}

export interface ActiveTenantAccess {
  userId: string
  employee: {
    id: string
    nombre: string
    rol: string
    tenant_id: string | null
  }
  tenant: CommercialTenant | null
  decision: TenantAccessDecision | null
  isDedicatedInstallation: boolean
}

interface AccessOptions {
  roles?: string[]
}

export async function requireActiveTenantAccess(
  options: AccessOptions = {},
): Promise<ActiveTenantAccess> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new TenantAccessError('UNAUTHENTICATED', '/login')

  const { data: employee } = await supabase
    .from('employees')
    .select('id, nombre, rol, activo, tenant_id')
    .eq('id', user.id)
    .single()

  if (!employee?.activo) {
    throw new TenantAccessError('EMPLOYEE_INACTIVE', '/login')
  }

  if (options.roles && !options.roles.includes(employee.rol)) {
    throw new TenantAccessError('FORBIDDEN_ROLE', '/')
  }

  if (!employee.tenant_id) {
    return {
      userId: user.id,
      employee,
      tenant: null,
      decision: null,
      isDedicatedInstallation: true,
    }
  }

  const { data: tenant } = await supabase
    .from('tenants')
    .select(COMMERCIAL_TENANT_SELECT)
    .eq('id', employee.tenant_id)
    .single()

  if (!tenant) throw new TenantAccessError('TENANT_NOT_FOUND', '/login')

  const typedTenant = tenant as unknown as CommercialTenant
  const decision = canTenantAccessPOS(typedTenant)

  if (!decision.allowed) {
    throw new TenantAccessError(
      'TENANT_ACCESS_EXPIRED',
      getCommercialRedirectPath(typedTenant, decision),
    )
  }

  return {
    userId: user.id,
    employee,
    tenant: typedTenant,
    decision,
    isDedicatedInstallation: false,
  }
}

export function tenantAccessErrorResult(error: unknown) {
  if (error instanceof TenantAccessError) {
    return {
      error: error.code,
      code: error.code,
      redirectTo: error.redirectTo,
    } as const
  }

  throw error
}

export async function activeTenantActionGate(options: AccessOptions = {}) {
  try {
    return {
      ok: true,
      access: await requireActiveTenantAccess(options),
    } as const
  } catch (error) {
    return {
      ok: false,
      result: tenantAccessErrorResult(error),
    } as const
  }
}
