import assert from 'node:assert/strict'
import test from 'node:test'

import {
  firstMonthlyChargeAt,
  MONTHLY_RECURRING_AMOUNT_CENTS,
  MONTHLY_SETUP_AMOUNT_CENTS,
} from '../src/lib/billing/pricing.ts'

test('el primer cobro es 3000 y la mensualidad es 500', () => {
  assert.equal(MONTHLY_SETUP_AMOUNT_CENTS, 300_000)
  assert.equal(MONTHLY_RECURRING_AMOUNT_CENTS, 50_000)
})

test('la primera mensualidad conserva día y hora un mes después', () => {
  const start = new Date('2026-08-04T09:12:16.000Z')
  assert.equal(firstMonthlyChargeAt(start).toISOString(), '2026-09-04T09:12:16.000Z')
})

test('el fin de mes se ajusta al último día disponible', () => {
  const start = new Date('2027-01-31T18:00:00.000Z')
  assert.equal(firstMonthlyChargeAt(start).toISOString(), '2027-02-28T18:00:00.000Z')
})
