'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// Define the cart item type
export interface CartItemExtra {
  extra_id: string
  nombre_extra: string
  precio_adicional: number
}

export interface CartItem {
  product_id: string
  cantidad: number
  precio_unitario: number
  nombre_producto: string
  // Legacy single extra (kept for compatibility but prefer extras_pago for new flow)
  extra_id?: string
  extra_precio?: number
  // Variante única (Caliente/Frío) — no cost
  variante_id?: string
  nombre_variante?: string
  // Multiple paid extras (Shot extra, Jarabe, etc.)
  extras_pago?: CartItemExtra[]
  ingredientes_seleccionados?: string[]
  cargo_ingredientes_extra?: number
  notas?: string
}

/**
 * Atomically validates and deducts inventory for all items in a cart.
 * Calls the validar_y_descontar_carrito RPC which either succeeds for ALL
 * inventory-managed products or rolls back entirely and throws an error.
 */
async function descontarInventario(supabase: any, items: CartItem[]): Promise<{ error?: string }> {
  // Aggregate quantities per product_id
  const aggregated: Record<string, number> = {}
  for (const item of items) {
    aggregated[item.product_id] = (aggregated[item.product_id] || 0) + item.cantidad
  }
  const payload = Object.entries(aggregated).map(([product_id, cantidad]) => ({ product_id, cantidad }))

  const { error } = await supabase.rpc('validar_y_descontar_carrito', { p_items: payload })
  if (error) return { error: error.message }
  return {}
}

async function insertOrderItems(
  supabase: any,
  orderId: string,
  items: CartItem[],
  employeeId: string
) {
  const orderItemsData = items.map(item => ({
    order_id: orderId,
    product_id: item.product_id,
    cantidad: item.cantidad,
    precio_unitario: item.precio_unitario,
    nombre_producto: item.nombre_producto,
    // Legacy extra (kept for backward compatibility)
    extra_id: item.extra_id || null,
    extra_precio: item.extra_precio || null,
    // New: variante única
    variante_id: item.variante_id || null,
    nombre_variante: item.nombre_variante || null,
    ingredientes_seleccionados: item.ingredientes_seleccionados || null,
    cargo_ingredientes_extra: item.cargo_ingredientes_extra || 0,
    notas: item.notas || null,
    enviado_a_cocina: false,
    creado_por: employeeId,
    pagado: false,
    cancelado: false
  }))

  const { data: insertedItems, error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItemsData)
    .select('id')

  if (itemsError) return { error: itemsError.message }

  // Insert order_item_extras (paid extras) for items that have them
  const extrasToInsert: any[] = []
  insertedItems.forEach((insertedItem: any, idx: number) => {
    const cartItem = items[idx]
    if (cartItem.extras_pago && cartItem.extras_pago.length > 0) {
      cartItem.extras_pago.forEach(ep => {
        extrasToInsert.push({
          order_item_id: insertedItem.id,
          extra_id: ep.extra_id,
          nombre_extra: ep.nombre_extra,
          precio_adicional: ep.precio_adicional,
        })
      })
    }
  })

  if (extrasToInsert.length > 0) {
    const { error: extrasError } = await supabase
      .from('order_item_extras')
      .insert(extrasToInsert)
    if (extrasError) return { error: extrasError.message }
  }

  return { success: true }
}

export async function createOrder(tipo: string, table_id: string | null, items: CartItem[], employeeId: string, nombreCliente?: string) {
  const supabase = await createClient()

  // Validate and deduct inventory atomically BEFORE creating any order
  const inventoryResult = await descontarInventario(supabase, items)
  if (inventoryResult.error) return { error: inventoryResult.error }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      tipo,
      table_id: table_id || null,
      nombre_cliente: nombreCliente || null,
      estado: 'abierto',
      creado_por: employeeId
    })
    .select('id')
    .single()

  let targetOrderId = order?.id

  if (orderError) {
    if (orderError.code === '23505' && tipo === 'mesa' && table_id) {
      // Unique constraint violation: an open order already exists for this table
      const { data: existingOrder, error: fetchError } = await supabase
        .from('orders')
        .select('id')
        .eq('table_id', table_id)
        .eq('estado', 'abierto')
        .eq('tipo', 'mesa')
        .order('creado_en', { ascending: true })
        .limit(1)
        .single()
      
      if (fetchError || !existingOrder) {
        return { error: 'Error al recuperar la orden existente para esta mesa.' }
      }
      targetOrderId = existingOrder.id
    } else if (orderError.code === '23505' && (tipo === 'para_llevar' || tipo === 'domicilio') && nombreCliente) {
      // Unique constraint violation: an open order already exists for this client name
      const { data: existingOrder, error: fetchError } = await supabase
        .from('orders')
        .select('id')
        .eq('tipo', tipo)
        .eq('estado', 'abierto')
        .ilike('nombre_cliente', nombreCliente.trim())
        .order('creado_en', { ascending: true })
        .limit(1)
        .single()

      if (fetchError || !existingOrder) {
        return { error: 'Error al recuperar la orden existente para este cliente.' }
      }
      targetOrderId = existingOrder.id
    } else {
      return { error: orderError.message }
    }
  }

  const result = await insertOrderItems(supabase, targetOrderId, items, employeeId)
  if (result.error) return { error: result.error }

  if (table_id && tipo === 'mesa') {
    await supabase.from('tables').update({ estado: 'ocupada' }).eq('id', table_id)
  }

  revalidatePath('/mesero')
  revalidatePath('/caja')
  return { success: true, orderId: targetOrderId }
}

export async function sendToKitchen(orderId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('order_items')
    .update({ enviado_a_cocina: true })
    .eq('order_id', orderId)
    .eq('enviado_a_cocina', false)

  if (error) return { error: error.message }

  revalidatePath('/mesero')
  revalidatePath('/caja')
  return { success: true }
}

async function autoCancelEmptyOrder(supabase: any, orderId: string) {
  const { data: remainingItems } = await supabase
    .from('order_items')
    .select('id')
    .eq('order_id', orderId)
    .eq('cancelado', false)

  if (remainingItems && remainingItems.length === 0) {
    // No active items left, auto-cancel the order
    await supabase
      .from('orders')
      .update({ estado: 'cancelado' })
      .eq('id', orderId)

    // Free the table if applicable
    const { data: order } = await supabase
      .from('orders')
      .select('tipo, table_id')
      .eq('id', orderId)
      .single()

    if (order?.tipo === 'mesa' && order.table_id) {
      await supabase.from('tables').update({ estado: 'libre' }).eq('id', order.table_id)
    }
  }
}

export async function cancelOrderItem(itemId: string, motivo: string, employeeId: string) {
  const supabase = await createClient()

  const { data: item } = await supabase
    .from('order_items')
    .select('order_id, product_id, cantidad')
    .eq('id', itemId)
    .single()

  const { error } = await supabase
    .from('order_items')
    .update({
      cancelado: true,
      motivo_cancelacion: motivo,
      cancelado_en: new Date().toISOString(),
      cancelado_por: employeeId
    })
    .eq('id', itemId)

  if (error) return { error: error.message }

  // Return inventory for products that manage stock
  if (item?.product_id && item?.cantidad) {
    await supabase.rpc('regresar_stock', {
      p_product_id: item.product_id,
      p_cantidad: item.cantidad,
    })
  }

  if (item?.order_id) {
    await autoCancelEmptyOrder(supabase, item.order_id)
  }

  revalidatePath('/mesero')
  revalidatePath('/caja')
  return { success: true }
}

export async function addItemsToOrder(orderId: string, items: CartItem[], employeeId: string) {
  const supabase = await createClient()

  // Validate and deduct inventory atomically BEFORE adding items
  const inventoryResult = await descontarInventario(supabase, items)
  if (inventoryResult.error) return { error: inventoryResult.error }

  const result = await insertOrderItems(supabase, orderId, items, employeeId)
  if (result.error) return { error: result.error }

  revalidatePath('/mesero')
  revalidatePath('/caja')
  return { success: true }
}

export async function deleteOrderItemUnsent(itemId: string) {
  const supabase = await createClient()

  const { data: item } = await supabase
    .from('order_items')
    .select('order_id, enviado_a_cocina, product_id, cantidad')
    .eq('id', itemId)
    .single()

  if (!item) return { error: 'Item no encontrado' }
  if (item.enviado_a_cocina) {
    return { error: 'No se puede eliminar porque este item ya fue enviado a cocina. Usa cancelar.' }
  }

  const { error } = await supabase
    .from('order_items')
    .delete()
    .eq('id', itemId)

  if (error) return { error: error.message }

  // Return inventory for products that manage stock
  if (item?.product_id && item?.cantidad) {
    await supabase.rpc('regresar_stock', {
      p_product_id: item.product_id,
      p_cantidad: item.cantidad,
    })
  }

  if (item?.order_id) {
    await autoCancelEmptyOrder(supabase, item.order_id)
  }

  revalidatePath('/mesero')
  revalidatePath('/caja')
  return { success: true }
}
