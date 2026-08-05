'use server'

import { createClient } from '@/utils/supabase/server'
import { activeTenantActionGate } from '@/lib/billing/server'
import { revalidatePath } from 'next/cache'

export async function processPayment({
  orderId,
  tableId,
  itemIds,
  metodo,
  montoRecibido,
  montoCobrado,
  cambio,
  employeeId
}: {
  orderId: string
  tableId: string | null
  itemIds: string[]
  metodo: 'efectivo' | 'tarjeta'
  montoRecibido: number
  montoCobrado: number
  cambio: number
  employeeId: string
}) {
  const gate = await activeTenantActionGate()
  if (!gate.ok) return gate.result
  const supabase = await createClient()

  const { error: payError } = await supabase.rpc('procesar_pago', {
    p_order_id: orderId,
    p_table_id: tableId,
    p_item_ids: itemIds,
    p_metodo: metodo,
    p_monto_recibido: metodo === 'efectivo' ? montoRecibido : null,
    p_monto_cobrado: montoCobrado,
    p_cambio: metodo === 'efectivo' ? cambio : 0,
    p_employee_id: employeeId
  })

  if (payError) return { error: payError.message }

  revalidatePath('/caja')
  return { success: true }
}

export async function addExpense({
  descripcion,
  monto,
  metodo,
  employeeId
}: {
  descripcion: string
  monto: number
  metodo: 'efectivo' | 'tarjeta'
  employeeId: string
}) {
  const gate = await activeTenantActionGate()
  if (!gate.ok) return gate.result
  const supabase = await createClient()

  const { error } = await supabase
    .from('movements')
    .insert({
      tipo: 'egreso',
      descripcion,
      monto,
      metodo,
      creado_por: employeeId
    })

  if (error) return { error: error.message }
  
  // Revalidate caja and admin views
  revalidatePath('/caja')
  revalidatePath('/admin')
  return { success: true }
}

export async function updatePaymentMethod({
  paymentId,
  nuevoMetodo,
  employeeId
}: {
  paymentId: string
  nuevoMetodo: 'efectivo' | 'tarjeta'
  employeeId: string
}) {
  const gate = await activeTenantActionGate()
  if (!gate.ok) return gate.result
  const supabase = await createClient()
  const { error } = await supabase.rpc('editar_metodo_pago', {
    p_payment_id: paymentId,
    p_nuevo_metodo: nuevoMetodo,
    p_employee_id: employeeId
  })
  if (error) return { error: error.message }
  revalidatePath('/caja')
  return { success: true }
}
