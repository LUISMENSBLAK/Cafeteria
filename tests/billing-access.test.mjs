import assert from 'node:assert/strict'
import test from 'node:test'

import { canTenantAccessPOS } from '../src/lib/billing/access.ts'

const now = new Date('2026-08-04T12:00:00.000Z')
const tenant = (overrides = {}) => ({
  id: 'tenant-1', slug: 'cafe-prueba', nombre_negocio: 'Café Prueba',
  trial_termina_en: '2026-08-05T12:00:00.000Z', billing_status: 'trialing', plan_type: null,
  ...overrides,
})

test('permite la prueba un milisegundo antes del vencimiento', () => {
  assert.equal(canTenantAccessPOS(tenant({ trial_termina_en: '2026-08-04T12:00:00.001Z' }), now).allowed, true)
})

test('bloquea la prueba en el instante exacto de vencimiento', () => {
  const result = canTenantAccessPOS(tenant({ trial_termina_en: '2026-08-04T12:00:00.000Z' }), now)
  assert.equal(result.allowed, false)
  assert.equal(result.effectiveStatus, 'expired')
})

test('la licencia de pago único no vence', () => {
  assert.equal(canTenantAccessPOS(tenant({ billing_status: 'active', plan_type: 'one_time', trial_termina_en: null }), now).allowed, true)
})

test('past_due permite la gracia y bloquea al terminar', () => {
  assert.equal(canTenantAccessPOS(tenant({ billing_status: 'past_due', plan_type: 'monthly', grace_period_ends_at: '2026-08-04T12:00:00.001Z' }), now).allowed, true)
  assert.equal(canTenantAccessPOS(tenant({ billing_status: 'past_due', plan_type: 'monthly', grace_period_ends_at: '2026-08-04T12:00:00.000Z' }), now).allowed, false)
})

test('cancelación al final de periodo conserva el tiempo pagado', () => {
  assert.equal(canTenantAccessPOS(tenant({ billing_status: 'canceled', plan_type: 'monthly', current_period_end: '2026-08-05T12:00:00.000Z' }), now).reason, 'canceled_period_active')
})

test('suspended prevalece sobre cualquier licencia', () => {
  const result = canTenantAccessPOS(tenant({ billing_status: 'active', plan_type: 'one_time', suspended_at: '2026-08-01T00:00:00.000Z' }), now)
  assert.equal(result.allowed, false)
  assert.equal(result.reason, 'suspended')
})

