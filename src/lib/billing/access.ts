export const BILLING_STATUS_VALUES = [
  'trialing',
  'active',
  'past_due',
  'expired',
  'canceled',
  'suspended',
] as const

export const PLAN_TYPE_VALUES = ['one_time', 'monthly'] as const

export type BillingStatus = (typeof BILLING_STATUS_VALUES)[number]
export type PlanType = (typeof PLAN_TYPE_VALUES)[number]

export interface CommercialTenant {
  id: string
  slug: string
  nombre_negocio: string
  nombre_contacto?: string | null
  email_contacto?: string | null
  creado_en?: string | null
  trial_started_at?: string | null
  trial_termina_en: string | null
  billing_status?: BillingStatus | null
  plan_type?: PlanType | null
  current_period_end?: string | null
  cancel_at_period_end?: boolean | null
  grace_period_ends_at?: string | null
  access_expires_at?: string | null
  suspended_at?: string | null
  estado?: 'trial' | 'activo' | 'vencido' | null
  plan?: 'mensual' | 'unico' | null
}

export type TenantAccessReason =
  | 'trial_active'
  | 'one_time_active'
  | 'monthly_active'
  | 'past_due_grace'
  | 'canceled_period_active'
  | 'trial_expired'
  | 'payment_required'
  | 'past_due_grace_expired'
  | 'subscription_ended'
  | 'suspended'

export interface TenantAccessDecision {
  allowed: boolean
  reason: TenantAccessReason
  effectiveStatus: BillingStatus
  graceEndsAt: string | null
  accessEndsAt: string | null
}

const isAfter = (value: string | null | undefined, nowMs: number) => {
  if (!value) return false
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) && timestamp > nowMs
}

export function getEffectiveBillingStatus(tenant: CommercialTenant): BillingStatus {
  if (tenant.billing_status) return tenant.billing_status

  if (tenant.estado === 'activo') return 'active'
  if (tenant.estado === 'vencido') return 'expired'
  return 'trialing'
}

export function getEffectivePlanType(tenant: CommercialTenant): PlanType | null {
  if (tenant.plan_type) return tenant.plan_type
  if (tenant.plan === 'unico') return 'one_time'
  if (tenant.plan === 'mensual') return 'monthly'
  return null
}

/**
 * Fuente única de verdad para el acceso comercial al POS.
 * Las fechas se comparan como instantes UTC (TIMESTAMPTZ/ISO 8601), sin
 * conversiones de zona horaria ni redondeos por día calendario.
 */
export function canTenantAccessPOS(
  tenant: CommercialTenant,
  now: Date = new Date(),
): TenantAccessDecision {
  const nowMs = now.getTime()
  const status = getEffectiveBillingStatus(tenant)
  const planType = getEffectivePlanType(tenant)

  if (status === 'suspended' || tenant.suspended_at) {
    return {
      allowed: false,
      reason: 'suspended',
      effectiveStatus: 'suspended',
      graceEndsAt: tenant.grace_period_ends_at ?? null,
      accessEndsAt: tenant.access_expires_at ?? null,
    }
  }

  if (status === 'trialing') {
    const allowed = isAfter(tenant.trial_termina_en, nowMs)
    return {
      allowed,
      reason: allowed ? 'trial_active' : 'trial_expired',
      effectiveStatus: allowed ? 'trialing' : 'expired',
      graceEndsAt: null,
      accessEndsAt: tenant.trial_termina_en,
    }
  }

  if (status === 'active' && planType === 'one_time') {
    return {
      allowed: true,
      reason: 'one_time_active',
      effectiveStatus: 'active',
      graceEndsAt: null,
      accessEndsAt: null,
    }
  }

  if (status === 'active' && planType === 'monthly') {
    const periodEnd = tenant.current_period_end ?? tenant.access_expires_at
    const allowed = !periodEnd || isAfter(periodEnd, nowMs)
    return {
      allowed,
      reason: allowed ? 'monthly_active' : 'subscription_ended',
      effectiveStatus: allowed ? 'active' : 'canceled',
      graceEndsAt: null,
      accessEndsAt: periodEnd ?? null,
    }
  }

  if (status === 'past_due') {
    const allowed = isAfter(tenant.grace_period_ends_at, nowMs)
    return {
      allowed,
      reason: allowed ? 'past_due_grace' : 'past_due_grace_expired',
      effectiveStatus: 'past_due',
      graceEndsAt: tenant.grace_period_ends_at ?? null,
      accessEndsAt: tenant.grace_period_ends_at ?? null,
    }
  }

  if (status === 'canceled') {
    const periodEnd = tenant.current_period_end ?? tenant.access_expires_at
    const allowed = isAfter(periodEnd, nowMs)
    return {
      allowed,
      reason: allowed ? 'canceled_period_active' : 'subscription_ended',
      effectiveStatus: 'canceled',
      graceEndsAt: null,
      accessEndsAt: periodEnd ?? null,
    }
  }

  return {
    allowed: false,
    reason: status === 'expired' ? 'trial_expired' : 'payment_required',
    effectiveStatus: status,
    graceEndsAt: tenant.grace_period_ends_at ?? null,
    accessEndsAt: tenant.access_expires_at ?? null,
  }
}

export function getCommercialRedirectPath(
  tenant: Pick<CommercialTenant, 'slug'>,
  decision: TenantAccessDecision,
) {
  return decision.effectiveStatus === 'past_due'
    ? `/demo/${tenant.slug}/regularizar`
    : `/demo/${tenant.slug}/vencido`
}

