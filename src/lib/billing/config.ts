const DEFAULT_GRACE_PERIOD_DAYS = 3

function positiveInteger(value: string | undefined, fallback: number) {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

export function getBillingConfig() {
  return {
    gracePeriodDays: positiveInteger(
      process.env.BILLING_GRACE_PERIOD_DAYS,
      DEFAULT_GRACE_PERIOD_DAYS,
    ),
  }
}
