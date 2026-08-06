export const LIFETIME_AMOUNT_CENTS = 500_000
export const MONTHLY_SETUP_AMOUNT_CENTS = 300_000
export const MONTHLY_RECURRING_AMOUNT_CENTS = 50_000
export const MONTHLY_PRICING_VERSION = 'monthly-3000-then-500-v1'

/**
 * Conserva el día y la hora cuando existe en el mes siguiente.
 * Si no existe (por ejemplo, 31 de enero), usa el último día de ese mes.
 */
export function firstMonthlyChargeAt(from = new Date()) {
  const result = new Date(from)
  const originalDay = result.getUTCDate()

  result.setUTCDate(1)
  result.setUTCMonth(result.getUTCMonth() + 1)

  const lastDayOfTargetMonth = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate()
  result.setUTCDate(Math.min(originalDay, lastDayOfTargetMonth))

  return result
}
