import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const migrationUrl = new URL(
  '../supabase/migrations/20260805000000_tenant_isolation_hardening.sql',
  import.meta.url,
)

test('la migración endurece los límites multi-tenant críticos', async () => {
  const sql = await readFile(migrationUrl, 'utf8')

  assert.match(sql, /CREATE TABLE public\.tenant_settings/)
  assert.match(sql, /PRIMARY KEY REFERENCES public\.tenants\(id\) ON DELETE CASCADE/)
  assert.match(sql, /CREATE TRIGGER trg_create_tenant_settings/)
  assert.match(sql, /COALESCE\(tenant_id, '00000000-0000-0000-0000-000000000000'::UUID\)/)
  assert.match(sql, /idx_orders_tenant_estado_creado/)
  assert.match(sql, /idx_order_items_tenant_order/)
  assert.match(sql, /idx_payments_tenant_creado/)
  assert.match(sql, /idx_movements_tenant_fecha/)
  assert.match(sql, /idx_products_tenant_activo/)
  assert.match(sql, /\(storage\.foldername\(name\)\)\[1\] = public\.get_current_user_tenant_id\(\)::TEXT/)
  assert.doesNotMatch(sql, /orders\.notas|SET\s+notas\s*=/i)
})

test('cada RPC de alto privilegio contiene un filtro tenant-aware', async () => {
  const sql = await readFile(migrationUrl, 'utf8')
  const functionNames = [
    'marcar_item_listo',
    'procesar_pago',
    'editar_metodo_pago',
    'obtener_egresos_efectivo',
    'validar_y_descontar_carrito',
    'regresar_stock',
    'fusionar_pedidos_duplicados_mesa',
    'anular_pago',
    'desanular_pago',
    'archivar_mes',
    'desarchivar_mes',
    'borrar_mes_permanente',
  ]

  for (const [index, functionName] of functionNames.entries()) {
    const start = sql.indexOf(`CREATE OR REPLACE FUNCTION public.${functionName}`)
    const nextName = functionNames[index + 1]
    const end = nextName
      ? sql.indexOf(`CREATE OR REPLACE FUNCTION public.${nextName}`, start + 1)
      : sql.indexOf('REVOKE ALL ON FUNCTION public.marcar_item_listo', start + 1)
    assert.notEqual(start, -1, `Falta ${functionName}`)
    const body = sql.slice(start, end === -1 ? undefined : end)
    assert.match(body, /assert_current_tenant_commercial_access\(\)/, `${functionName} no resuelve tenant`)
    assert.match(body, /tenant_id IS NOT DISTINCT FROM v_tenant_id/, `${functionName} no filtra tenant`)
  }
})
