-- ============================================================
-- Guard comercial para RPCs SECURITY DEFINER existentes.
-- Mantiene intacta la implementación operativa y la coloca detrás de una
-- comprobación única que también cubre invocaciones directas a PostgREST.
-- ============================================================

CREATE OR REPLACE FUNCTION public.assert_current_tenant_commercial_access()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED' USING ERRCODE = 'P0001';
  END IF;

  SELECT tenant_id INTO v_tenant_id
  FROM public.employees
  WHERE id = auth.uid() AND activo = true
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'EMPLOYEE_INACTIVE' USING ERRCODE = 'P0001';
  END IF;

  -- Las instalaciones dedicadas existentes tienen tenant_id NULL y no están
  -- sujetas al ciclo SaaS multi-tenant.
  IF v_tenant_id IS NOT NULL AND NOT public.can_tenant_access_pos(v_tenant_id) THEN
    RAISE EXCEPTION 'TENANT_ACCESS_EXPIRED' USING ERRCODE = 'P0001';
  END IF;

  RETURN v_tenant_id;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_current_tenant_commercial_access() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assert_current_tenant_commercial_access() TO authenticated, service_role;

-- Cocina
ALTER FUNCTION public.marcar_item_listo(UUID, BOOLEAN)
  RENAME TO marcar_item_listo_commercial_impl;
REVOKE ALL ON FUNCTION public.marcar_item_listo_commercial_impl(UUID, BOOLEAN) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.marcar_item_listo(p_item_id UUID, p_listo BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.assert_current_tenant_commercial_access();
  PERFORM public.marcar_item_listo_commercial_impl(p_item_id, p_listo);
END;
$$;

-- Caja
ALTER FUNCTION public.procesar_pago(UUID, UUID, UUID[], TEXT, NUMERIC, NUMERIC, NUMERIC, UUID)
  RENAME TO procesar_pago_commercial_impl;
REVOKE ALL ON FUNCTION public.procesar_pago_commercial_impl(UUID, UUID, UUID[], TEXT, NUMERIC, NUMERIC, NUMERIC, UUID) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.procesar_pago(
  p_order_id UUID,
  p_table_id UUID,
  p_item_ids UUID[],
  p_metodo TEXT,
  p_monto_recibido NUMERIC,
  p_monto_cobrado NUMERIC,
  p_cambio NUMERIC,
  p_employee_id UUID
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.assert_current_tenant_commercial_access();
  PERFORM public.procesar_pago_commercial_impl(
    p_order_id, p_table_id, p_item_ids, p_metodo, p_monto_recibido,
    p_monto_cobrado, p_cambio, p_employee_id
  );
END;
$$;

ALTER FUNCTION public.editar_metodo_pago(UUID, TEXT, UUID)
  RENAME TO editar_metodo_pago_commercial_impl;
REVOKE ALL ON FUNCTION public.editar_metodo_pago_commercial_impl(UUID, TEXT, UUID) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.editar_metodo_pago(p_payment_id UUID, p_nuevo_metodo TEXT, p_employee_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.assert_current_tenant_commercial_access();
  PERFORM public.editar_metodo_pago_commercial_impl(p_payment_id, p_nuevo_metodo, p_employee_id);
END;
$$;

ALTER FUNCTION public.obtener_egresos_efectivo(TIMESTAMPTZ)
  RENAME TO obtener_egresos_efectivo_commercial_impl;
REVOKE ALL ON FUNCTION public.obtener_egresos_efectivo_commercial_impl(TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.obtener_egresos_efectivo(p_desde TIMESTAMPTZ)
RETURNS NUMERIC LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_result NUMERIC;
BEGIN
  PERFORM public.assert_current_tenant_commercial_access();
  SELECT public.obtener_egresos_efectivo_commercial_impl(p_desde) INTO v_result;
  RETURN v_result;
END;
$$;

-- Inventario y órdenes
ALTER FUNCTION public.validar_y_descontar_carrito(JSONB)
  RENAME TO validar_y_descontar_carrito_commercial_impl;
REVOKE ALL ON FUNCTION public.validar_y_descontar_carrito_commercial_impl(JSONB) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.validar_y_descontar_carrito(p_items JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_result JSONB;
BEGIN
  PERFORM public.assert_current_tenant_commercial_access();
  SELECT public.validar_y_descontar_carrito_commercial_impl(p_items) INTO v_result;
  RETURN v_result;
END;
$$;

ALTER FUNCTION public.regresar_stock(UUID, INTEGER)
  RENAME TO regresar_stock_commercial_impl;
REVOKE ALL ON FUNCTION public.regresar_stock_commercial_impl(UUID, INTEGER) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.regresar_stock(p_product_id UUID, p_cantidad INTEGER)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.assert_current_tenant_commercial_access();
  PERFORM public.regresar_stock_commercial_impl(p_product_id, p_cantidad);
END;
$$;

ALTER FUNCTION public.fusionar_pedidos_duplicados_mesa(UUID)
  RENAME TO fusionar_pedidos_duplicados_mesa_commercial_impl;
REVOKE ALL ON FUNCTION public.fusionar_pedidos_duplicados_mesa_commercial_impl(UUID) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.fusionar_pedidos_duplicados_mesa(p_table_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.assert_current_tenant_commercial_access();
  PERFORM public.fusionar_pedidos_duplicados_mesa_commercial_impl(p_table_id);
END;
$$;

-- Administración financiera
ALTER FUNCTION public.anular_pago(UUID, TEXT, UUID)
  RENAME TO anular_pago_commercial_impl;
REVOKE ALL ON FUNCTION public.anular_pago_commercial_impl(UUID, TEXT, UUID) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.anular_pago(p_payment_id UUID, p_motivo TEXT, p_employee_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.assert_current_tenant_commercial_access();
  PERFORM public.anular_pago_commercial_impl(p_payment_id, p_motivo, p_employee_id);
END;
$$;

ALTER FUNCTION public.desanular_pago(UUID, UUID)
  RENAME TO desanular_pago_commercial_impl;
REVOKE ALL ON FUNCTION public.desanular_pago_commercial_impl(UUID, UUID) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.desanular_pago(p_payment_id UUID, p_employee_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.assert_current_tenant_commercial_access();
  PERFORM public.desanular_pago_commercial_impl(p_payment_id, p_employee_id);
END;
$$;

ALTER FUNCTION public.archivar_mes(TIMESTAMPTZ, TIMESTAMPTZ)
  RENAME TO archivar_mes_commercial_impl;
REVOKE ALL ON FUNCTION public.archivar_mes_commercial_impl(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.archivar_mes(p_start TIMESTAMPTZ, p_end TIMESTAMPTZ)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_result JSONB;
BEGIN
  PERFORM public.assert_current_tenant_commercial_access();
  SELECT public.archivar_mes_commercial_impl(p_start, p_end) INTO v_result;
  RETURN v_result;
END;
$$;

ALTER FUNCTION public.desarchivar_mes(TIMESTAMPTZ, TIMESTAMPTZ)
  RENAME TO desarchivar_mes_commercial_impl;
REVOKE ALL ON FUNCTION public.desarchivar_mes_commercial_impl(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.desarchivar_mes(p_start TIMESTAMPTZ, p_end TIMESTAMPTZ)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_result JSONB;
BEGIN
  PERFORM public.assert_current_tenant_commercial_access();
  SELECT public.desarchivar_mes_commercial_impl(p_start, p_end) INTO v_result;
  RETURN v_result;
END;
$$;

ALTER FUNCTION public.borrar_mes_permanente(TIMESTAMPTZ, TIMESTAMPTZ)
  RENAME TO borrar_mes_permanente_commercial_impl;
REVOKE ALL ON FUNCTION public.borrar_mes_permanente_commercial_impl(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.borrar_mes_permanente(p_start TIMESTAMPTZ, p_end TIMESTAMPTZ)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_result JSONB;
BEGIN
  PERFORM public.assert_current_tenant_commercial_access();
  SELECT public.borrar_mes_permanente_commercial_impl(p_start, p_end) INTO v_result;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.marcar_item_listo(UUID, BOOLEAN) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.procesar_pago(UUID, UUID, UUID[], TEXT, NUMERIC, NUMERIC, NUMERIC, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.editar_metodo_pago(UUID, TEXT, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.obtener_egresos_efectivo(TIMESTAMPTZ) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.validar_y_descontar_carrito(JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.regresar_stock(UUID, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fusionar_pedidos_duplicados_mesa(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.anular_pago(UUID, TEXT, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.desanular_pago(UUID, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.archivar_mes(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.desarchivar_mes(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.borrar_mes_permanente(TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.marcar_item_listo(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.procesar_pago(UUID, UUID, UUID[], TEXT, NUMERIC, NUMERIC, NUMERIC, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.editar_metodo_pago(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.obtener_egresos_efectivo(TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validar_y_descontar_carrito(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.regresar_stock(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fusionar_pedidos_duplicados_mesa(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.anular_pago(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.desanular_pago(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.archivar_mes(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.desarchivar_mes(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.borrar_mes_permanente(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

NOTIFY pgrst, 'reload schema';
