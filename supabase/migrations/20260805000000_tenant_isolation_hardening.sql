-- ============================================================
-- Aislamiento multi-tenant para configuración, RPCs y Storage.
-- Conserva public.settings para instalaciones dedicadas (tenant_id NULL)
-- y utiliza public.tenant_settings para cada negocio SaaS.
-- ============================================================

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS caja_apertura_automatica BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE public.tenant_settings (
  tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  impresora_activa BOOLEAN NOT NULL DEFAULT false,
  impresora_modo TEXT NOT NULL DEFAULT 'red'
    CHECK (impresora_modo IN ('red', 'bluetooth', 'usb_qz', 'android_usb', 'android_bluetooth')),
  impresora_ip TEXT,
  impresora_papel_mm TEXT NOT NULL DEFAULT '80'
    CHECK (impresora_papel_mm IN ('58', '80')),
  nombre_impresora_windows TEXT,
  caja_apertura_automatica BOOLEAN NOT NULL DEFAULT true,
  ticket_tamano_fuente TEXT NOT NULL DEFAULT 'normal'
    CHECK (ticket_tamano_fuente IN ('pequena', 'normal', 'grande')),
  ticket_mensaje_despedida TEXT NOT NULL DEFAULT '¡Gracias por su compra! Vuelva pronto.',
  ticket_mostrar_atendido_por BOOLEAN NOT NULL DEFAULT true,
  ticket_mostrar_logo BOOLEAN NOT NULL DEFAULT true,
  negocio_nombre TEXT NOT NULL DEFAULT 'Mi Cafetería',
  negocio_direccion TEXT,
  negocio_telefono TEXT,
  negocio_rfc TEXT,
  ticket_linea_extra TEXT,
  meta_diaria NUMERIC(10, 2) NOT NULL DEFAULT 0,
  meta_semanal NUMERIC(10, 2) NOT NULL DEFAULT 0,
  meta_mensual NUMERIC(10, 2) NOT NULL DEFAULT 0,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dar continuidad a los tenants existentes sin compartir cambios futuros.
INSERT INTO public.tenant_settings (
  tenant_id,
  impresora_activa,
  impresora_modo,
  impresora_ip,
  impresora_papel_mm,
  nombre_impresora_windows,
  caja_apertura_automatica,
  ticket_tamano_fuente,
  ticket_mensaje_despedida,
  ticket_mostrar_atendido_por,
  ticket_mostrar_logo,
  negocio_nombre,
  negocio_direccion,
  negocio_telefono,
  negocio_rfc,
  ticket_linea_extra,
  meta_diaria,
  meta_semanal,
  meta_mensual
)
SELECT
  t.id,
  COALESCE(s.impresora_activa, false),
  COALESCE(s.impresora_modo, 'red'),
  s.impresora_ip,
  COALESCE(s.impresora_papel_mm, '80'),
  s.nombre_impresora_windows,
  COALESCE(s.caja_apertura_automatica, true),
  COALESCE(s.ticket_tamano_fuente, 'normal'),
  COALESCE(s.ticket_mensaje_despedida, '¡Gracias por su compra! Vuelva pronto.'),
  COALESCE(s.ticket_mostrar_atendido_por, true),
  COALESCE(s.ticket_mostrar_logo, true),
  COALESCE(t.nombre_negocio, s.negocio_nombre, 'Mi Cafetería'),
  s.negocio_direccion,
  s.negocio_telefono,
  s.negocio_rfc,
  s.ticket_linea_extra,
  COALESCE(s.meta_diaria, 0),
  COALESCE(s.meta_semanal, 0),
  COALESCE(s.meta_mensual, 0)
FROM public.tenants t
CROSS JOIN public.settings s
WHERE s.id = 1
ON CONFLICT (tenant_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.create_tenant_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.tenant_settings (tenant_id, negocio_nombre)
  VALUES (NEW.id, NEW.nombre_negocio)
  ON CONFLICT (tenant_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_tenant_settings ON public.tenants;
CREATE TRIGGER trg_create_tenant_settings
AFTER INSERT ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.create_tenant_settings();

CREATE OR REPLACE FUNCTION public.touch_tenant_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.actualizado_en := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_tenant_settings ON public.tenant_settings;
CREATE TRIGGER trg_touch_tenant_settings
BEFORE UPDATE ON public.tenant_settings
FOR EACH ROW EXECUTE FUNCTION public.touch_tenant_settings();

ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_active_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employees
    WHERE id = auth.uid() AND activo = true AND rol = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_active_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_admin() TO authenticated, service_role;

DROP POLICY IF EXISTS "tenant_settings_read_own" ON public.tenant_settings;
CREATE POLICY "tenant_settings_read_own"
ON public.tenant_settings FOR SELECT TO authenticated
USING (tenant_id = public.get_current_user_tenant_id());

DROP POLICY IF EXISTS "tenant_settings_admin_update_own" ON public.tenant_settings;
CREATE POLICY "tenant_settings_admin_update_own"
ON public.tenant_settings FOR UPDATE TO authenticated
USING (
  tenant_id = public.get_current_user_tenant_id()
  AND public.is_active_admin()
)
WITH CHECK (
  tenant_id = public.get_current_user_tenant_id()
  AND public.is_active_admin()
);

REVOKE ALL ON TABLE public.tenant_settings FROM PUBLIC, anon;
GRANT SELECT, UPDATE ON TABLE public.tenant_settings TO authenticated;
GRANT ALL ON TABLE public.tenant_settings TO service_role;

-- Caja puede cambiar únicamente su preferencia de apertura por este RPC.
CREATE OR REPLACE FUNCTION public.set_caja_apertura_automatica(p_activa BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  v_tenant_id := public.assert_current_tenant_commercial_access();

  IF NOT EXISTS (
    SELECT 1 FROM public.employees
    WHERE id = auth.uid()
      AND activo = true
      AND rol IN ('caja', 'admin')
      AND tenant_id IS NOT DISTINCT FROM v_tenant_id
  ) THEN
    RAISE EXCEPTION 'Solo caja o admin puede cambiar este ajuste';
  END IF;

  IF v_tenant_id IS NULL THEN
    UPDATE public.settings
    SET caja_apertura_automatica = p_activa
    WHERE id = 1;
  ELSE
    UPDATE public.tenant_settings
    SET caja_apertura_automatica = p_activa
    WHERE tenant_id = v_tenant_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_caja_apertura_automatica(BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_caja_apertura_automatica(BOOLEAN) TO authenticated;

-- ============================================================
-- Índices tenant-aware.
-- ============================================================

DROP INDEX IF EXISTS public.idx_unique_open_order_per_cliente;
CREATE UNIQUE INDEX idx_unique_open_order_per_cliente
ON public.orders (
  COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::UUID),
  tipo,
  LOWER(TRIM(nombre_cliente))
)
WHERE estado = 'abierto'
  AND tipo IN ('para_llevar', 'domicilio')
  AND nombre_cliente IS NOT NULL
  AND TRIM(nombre_cliente) <> '';

CREATE INDEX IF NOT EXISTS idx_orders_tenant_estado_creado
  ON public.orders (tenant_id, estado, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_tenant_order
  ON public.order_items (tenant_id, order_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_creado
  ON public.payments (tenant_id, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_movements_tenant_fecha
  ON public.movements (tenant_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_products_tenant_activo
  ON public.products (tenant_id, activo);
CREATE INDEX IF NOT EXISTS idx_tables_tenant_estado
  ON public.tables (tenant_id, estado);
CREATE INDEX IF NOT EXISTS idx_employees_tenant_activo_rol
  ON public.employees (tenant_id, activo, rol);
CREATE INDEX IF NOT EXISTS idx_cortes_tenant_creado
  ON public.cortes_caja (tenant_id, creado_en DESC);

-- ============================================================
-- Storage: cada tenant escribe únicamente dentro de /{tenant_id}/...
-- Las instalaciones dedicadas escriben dentro de /legacy/...
-- ============================================================

DROP POLICY IF EXISTS "Admin can insert products images" ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete products images" ON storage.objects;
DROP POLICY IF EXISTS "tenant_admin_insert_product_assets" ON storage.objects;
DROP POLICY IF EXISTS "tenant_admin_update_product_assets" ON storage.objects;
DROP POLICY IF EXISTS "tenant_admin_delete_product_assets" ON storage.objects;

CREATE POLICY "tenant_admin_insert_product_assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'productos'
  AND public.is_active_admin()
  AND (
    (
      public.get_current_user_tenant_id() IS NOT NULL
      AND (storage.foldername(name))[1] = public.get_current_user_tenant_id()::TEXT
    )
    OR (
      public.get_current_user_tenant_id() IS NULL
      AND (storage.foldername(name))[1] = 'legacy'
    )
  )
);

CREATE POLICY "tenant_admin_update_product_assets"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'productos'
  AND public.is_active_admin()
  AND (
    (
      public.get_current_user_tenant_id() IS NOT NULL
      AND (storage.foldername(name))[1] = public.get_current_user_tenant_id()::TEXT
    )
    OR (
      public.get_current_user_tenant_id() IS NULL
      AND (storage.foldername(name))[1] = 'legacy'
    )
  )
)
WITH CHECK (
  bucket_id = 'productos'
  AND public.is_active_admin()
  AND (
    (
      public.get_current_user_tenant_id() IS NOT NULL
      AND (storage.foldername(name))[1] = public.get_current_user_tenant_id()::TEXT
    )
    OR (
      public.get_current_user_tenant_id() IS NULL
      AND (storage.foldername(name))[1] = 'legacy'
    )
  )
);

CREATE POLICY "tenant_admin_delete_product_assets"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'productos'
  AND public.is_active_admin()
  AND (
    (
      public.get_current_user_tenant_id() IS NOT NULL
      AND (storage.foldername(name))[1] = public.get_current_user_tenant_id()::TEXT
    )
    OR (
      public.get_current_user_tenant_id() IS NULL
      AND (storage.foldername(name))[1] = 'legacy'
    )
  )
);

-- ============================================================
-- RPCs SECURITY DEFINER reimplementados con tenant_id obligatorio.
-- ============================================================

CREATE OR REPLACE FUNCTION public.marcar_item_listo(p_item_id UUID, p_listo BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  v_tenant_id := public.assert_current_tenant_commercial_access();
  IF NOT EXISTS (
    SELECT 1 FROM public.employees
    WHERE id = auth.uid() AND activo = true AND rol = 'cocina'
      AND tenant_id IS NOT DISTINCT FROM v_tenant_id
  ) THEN
    RAISE EXCEPTION 'Solo cocina puede marcar items como listos';
  END IF;

  UPDATE public.order_items
  SET listo = p_listo
  WHERE id = p_item_id
    AND tenant_id IS NOT DISTINCT FROM v_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item no encontrado en este negocio';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.procesar_pago(
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
DECLARE
  v_tenant_id UUID;
  v_invalid_count INTEGER;
  v_item_count INTEGER;
  v_remaining_unpaid INTEGER;
BEGIN
  v_tenant_id := public.assert_current_tenant_commercial_access();

  IF p_employee_id IS DISTINCT FROM auth.uid() OR NOT EXISTS (
    SELECT 1 FROM public.employees
    WHERE id = auth.uid() AND activo = true AND rol = 'caja'
      AND tenant_id IS NOT DISTINCT FROM v_tenant_id
  ) THEN
    RAISE EXCEPTION 'Solo caja puede procesar pagos';
  END IF;
  IF p_metodo NOT IN ('efectivo', 'tarjeta') THEN
    RAISE EXCEPTION 'Método de pago inválido';
  END IF;
  IF p_item_ids IS NULL OR cardinality(p_item_ids) = 0 THEN
    RAISE EXCEPTION 'Debes seleccionar al menos un item';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.orders
    WHERE id = p_order_id AND estado = 'abierto'
      AND tenant_id IS NOT DISTINCT FROM v_tenant_id
      AND table_id IS NOT DISTINCT FROM p_table_id
  ) THEN
    RAISE EXCEPTION 'Pedido o mesa no corresponden a este negocio';
  END IF;
  IF p_table_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.tables
    WHERE id = p_table_id AND tenant_id IS NOT DISTINCT FROM v_tenant_id
  ) THEN
    RAISE EXCEPTION 'Mesa no encontrada en este negocio';
  END IF;

  PERFORM 1 FROM public.order_items
  WHERE id = ANY(p_item_ids)
    AND order_id = p_order_id
    AND tenant_id IS NOT DISTINCT FROM v_tenant_id
  FOR UPDATE;

  SELECT COUNT(DISTINCT id), COUNT(*) FILTER (WHERE pagado OR cancelado)
  INTO v_item_count, v_invalid_count
  FROM public.order_items
  WHERE id = ANY(p_item_ids)
    AND order_id = p_order_id
    AND tenant_id IS NOT DISTINCT FROM v_tenant_id;

  IF v_item_count <> cardinality(p_item_ids) THEN
    RAISE EXCEPTION 'Uno o más items no pertenecen a este pedido o negocio';
  END IF;
  IF v_invalid_count > 0 THEN
    RAISE EXCEPTION 'Uno o más productos ya fueron cobrados o cancelados, actualiza la pantalla';
  END IF;

  INSERT INTO public.payments (
    order_id, metodo, monto_recibido, monto_cobrado, cambio, item_ids, cobrado_por, tenant_id
  ) VALUES (
    p_order_id, p_metodo, p_monto_recibido, p_monto_cobrado, p_cambio,
    p_item_ids, p_employee_id, v_tenant_id
  );

  UPDATE public.order_items SET pagado = true
  WHERE id = ANY(p_item_ids)
    AND order_id = p_order_id
    AND tenant_id IS NOT DISTINCT FROM v_tenant_id;

  SELECT COUNT(*) INTO v_remaining_unpaid
  FROM public.order_items
  WHERE order_id = p_order_id
    AND tenant_id IS NOT DISTINCT FROM v_tenant_id
    AND pagado = false AND cancelado = false;

  IF v_remaining_unpaid = 0 THEN
    UPDATE public.orders SET estado = 'cerrado'
    WHERE id = p_order_id AND tenant_id IS NOT DISTINCT FROM v_tenant_id;
    IF p_table_id IS NOT NULL THEN
      UPDATE public.tables SET estado = 'libre'
      WHERE id = p_table_id AND tenant_id IS NOT DISTINCT FROM v_tenant_id;
    END IF;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.editar_metodo_pago(
  p_payment_id UUID, p_nuevo_metodo TEXT, p_employee_id UUID
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant_id UUID;
  v_creado_en TIMESTAMPTZ;
BEGIN
  v_tenant_id := public.assert_current_tenant_commercial_access();
  IF p_employee_id IS DISTINCT FROM auth.uid() OR NOT EXISTS (
    SELECT 1 FROM public.employees
    WHERE id = auth.uid() AND activo = true AND rol = 'admin'
      AND tenant_id IS NOT DISTINCT FROM v_tenant_id
  ) THEN
    RAISE EXCEPTION 'Solo un administrador puede cambiar el método de pago';
  END IF;
  IF p_nuevo_metodo NOT IN ('efectivo', 'tarjeta') THEN
    RAISE EXCEPTION 'Método de pago inválido';
  END IF;

  SELECT creado_en INTO v_creado_en
  FROM public.payments
  WHERE id = p_payment_id AND anulado = false
    AND tenant_id IS NOT DISTINCT FROM v_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pago no encontrado o anulado en este negocio';
  END IF;
  IF v_creado_en::DATE <> CURRENT_DATE THEN
    RAISE EXCEPTION 'Solo se puede editar el método de pago el mismo día en que se registró';
  END IF;

  UPDATE public.payments SET metodo = p_nuevo_metodo
  WHERE id = p_payment_id AND tenant_id IS NOT DISTINCT FROM v_tenant_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.obtener_egresos_efectivo(p_desde TIMESTAMPTZ)
RETURNS NUMERIC LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant_id UUID;
  v_result NUMERIC;
BEGIN
  v_tenant_id := public.assert_current_tenant_commercial_access();
  SELECT COALESCE(SUM(monto), 0) INTO v_result
  FROM public.movements
  WHERE tipo = 'egreso' AND metodo = 'efectivo' AND fecha >= p_desde
    AND tenant_id IS NOT DISTINCT FROM v_tenant_id;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.validar_y_descontar_carrito(p_items JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant_id UUID;
  v_item JSONB;
  v_product_id UUID;
  v_cantidad INTEGER;
  v_nombre TEXT;
  v_stock INTEGER;
  v_maneja_inventario BOOLEAN;
BEGIN
  v_tenant_id := public.assert_current_tenant_commercial_access();
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'El carrito no es válido';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_cantidad := (v_item->>'cantidad')::INTEGER;
    IF v_cantidad IS NULL OR v_cantidad <= 0 THEN
      RAISE EXCEPTION 'La cantidad del producto no es válida';
    END IF;

    SELECT nombre, COALESCE(stock_actual, 0), maneja_inventario
    INTO v_nombre, v_stock, v_maneja_inventario
    FROM public.products
    WHERE id = v_product_id
      AND activo = true
      AND tenant_id IS NOT DISTINCT FROM v_tenant_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Producto no encontrado en este negocio';
    END IF;

    IF v_maneja_inventario THEN
      IF v_stock < v_cantidad THEN
        RAISE EXCEPTION 'Stock insuficiente para el producto "%" (Quedan: %, Solicitado: %).',
          v_nombre, v_stock, v_cantidad;
      END IF;
      UPDATE public.products
      SET stock_actual = COALESCE(stock_actual, 0) - v_cantidad
      WHERE id = v_product_id
        AND tenant_id IS NOT DISTINCT FROM v_tenant_id;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.regresar_stock(p_product_id UUID, p_cantidad INTEGER)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  v_tenant_id := public.assert_current_tenant_commercial_access();
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN
    RAISE EXCEPTION 'La cantidad debe ser mayor que cero';
  END IF;
  UPDATE public.products
  SET stock_actual = COALESCE(stock_actual, 0) + p_cantidad
  WHERE id = p_product_id AND maneja_inventario = true
    AND tenant_id IS NOT DISTINCT FROM v_tenant_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Producto con inventario no encontrado en este negocio';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.fusionar_pedidos_duplicados_mesa(p_table_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant_id UUID;
  v_oldest_order_id UUID;
  v_duplicate_ids UUID[];
BEGIN
  v_tenant_id := public.assert_current_tenant_commercial_access();
  IF NOT EXISTS (
    SELECT 1 FROM public.tables
    WHERE id = p_table_id AND tenant_id IS NOT DISTINCT FROM v_tenant_id
  ) THEN
    RAISE EXCEPTION 'Mesa no encontrada en este negocio';
  END IF;

  SELECT id INTO v_oldest_order_id
  FROM public.orders
  WHERE table_id = p_table_id AND estado = 'abierto' AND tipo = 'mesa'
    AND tenant_id IS NOT DISTINCT FROM v_tenant_id
  ORDER BY creado_en ASC
  LIMIT 1;

  IF v_oldest_order_id IS NULL THEN RETURN; END IF;

  SELECT array_agg(id) INTO v_duplicate_ids
  FROM public.orders
  WHERE table_id = p_table_id AND estado = 'abierto' AND tipo = 'mesa'
    AND id <> v_oldest_order_id
    AND tenant_id IS NOT DISTINCT FROM v_tenant_id;

  IF cardinality(v_duplicate_ids) > 0 THEN
    UPDATE public.order_items SET order_id = v_oldest_order_id
    WHERE order_id = ANY(v_duplicate_ids)
      AND tenant_id IS NOT DISTINCT FROM v_tenant_id;
    UPDATE public.orders SET estado = 'cancelado'
    WHERE id = ANY(v_duplicate_ids)
      AND tenant_id IS NOT DISTINCT FROM v_tenant_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.anular_pago(
  p_payment_id UUID, p_motivo TEXT, p_employee_id UUID
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant_id UUID;
  v_order_id UUID;
  v_table_id UUID;
  v_item_ids UUID[];
  v_already_annulled BOOLEAN;
BEGIN
  v_tenant_id := public.assert_current_tenant_commercial_access();
  IF p_employee_id IS DISTINCT FROM auth.uid() OR NOT EXISTS (
    SELECT 1 FROM public.employees
    WHERE id = auth.uid() AND activo = true AND rol = 'admin'
      AND tenant_id IS NOT DISTINCT FROM v_tenant_id
  ) THEN
    RAISE EXCEPTION 'Solo admin puede anular pagos';
  END IF;

  SELECT order_id, item_ids, anulado
  INTO v_order_id, v_item_ids, v_already_annulled
  FROM public.payments
  WHERE id = p_payment_id AND tenant_id IS NOT DISTINCT FROM v_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Pago no encontrado en este negocio'; END IF;
  IF v_already_annulled THEN RAISE EXCEPTION 'El pago ya estaba anulado'; END IF;

  UPDATE public.payments SET anulado = true, motivo_anulacion = p_motivo
  WHERE id = p_payment_id AND tenant_id IS NOT DISTINCT FROM v_tenant_id;
  UPDATE public.order_items SET pagado = false
  WHERE id = ANY(v_item_ids) AND tenant_id IS NOT DISTINCT FROM v_tenant_id;
  UPDATE public.orders SET estado = 'abierto'
  WHERE id = v_order_id AND tenant_id IS NOT DISTINCT FROM v_tenant_id;
  SELECT table_id INTO v_table_id FROM public.orders
  WHERE id = v_order_id AND tenant_id IS NOT DISTINCT FROM v_tenant_id;
  IF v_table_id IS NOT NULL THEN
    UPDATE public.tables SET estado = 'ocupada'
    WHERE id = v_table_id AND tenant_id IS NOT DISTINCT FROM v_tenant_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.desanular_pago(p_payment_id UUID, p_employee_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant_id UUID;
  v_order_id UUID;
  v_item_ids UUID[];
  v_anulado BOOLEAN;
  v_creado_en TIMESTAMPTZ;
BEGIN
  v_tenant_id := public.assert_current_tenant_commercial_access();
  IF p_employee_id IS DISTINCT FROM auth.uid() OR NOT EXISTS (
    SELECT 1 FROM public.employees
    WHERE id = auth.uid() AND activo = true AND rol = 'admin'
      AND tenant_id IS NOT DISTINCT FROM v_tenant_id
  ) THEN
    RAISE EXCEPTION 'Solo admin puede desanular pagos';
  END IF;

  SELECT order_id, item_ids, anulado, creado_en
  INTO v_order_id, v_item_ids, v_anulado, v_creado_en
  FROM public.payments
  WHERE id = p_payment_id AND tenant_id IS NOT DISTINCT FROM v_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Pago no encontrado en este negocio'; END IF;
  IF NOT v_anulado THEN RAISE EXCEPTION 'Este pago no está anulado'; END IF;
  IF v_creado_en::DATE <> CURRENT_DATE THEN
    RAISE EXCEPTION 'Solo se puede desanular un pago el mismo día en que se anuló';
  END IF;

  UPDATE public.payments SET anulado = false, motivo_anulacion = NULL
  WHERE id = p_payment_id AND tenant_id IS NOT DISTINCT FROM v_tenant_id;
  UPDATE public.order_items SET pagado = true
  WHERE id = ANY(v_item_ids) AND tenant_id IS NOT DISTINCT FROM v_tenant_id;
  IF NOT EXISTS (
    SELECT 1 FROM public.order_items
    WHERE order_id = v_order_id AND pagado = false AND cancelado = false
      AND tenant_id IS NOT DISTINCT FROM v_tenant_id
  ) THEN
    UPDATE public.orders SET estado = 'cerrado'
    WHERE id = v_order_id AND tenant_id IS NOT DISTINCT FROM v_tenant_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.archivar_mes(p_start TIMESTAMPTZ, p_end TIMESTAMPTZ)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant_id UUID;
  v_orders_count INTEGER;
  v_payments_count INTEGER;
  v_movs_count INTEGER;
BEGIN
  v_tenant_id := public.assert_current_tenant_commercial_access();
  IF NOT EXISTS (
    SELECT 1 FROM public.employees
    WHERE id = auth.uid() AND activo = true AND rol = 'admin'
      AND tenant_id IS NOT DISTINCT FROM v_tenant_id
  ) THEN RAISE EXCEPTION 'Solo admin puede archivar meses'; END IF;
  IF p_end >= now() THEN
    RAISE EXCEPTION 'No se puede archivar un mes que aún no ha terminado';
  END IF;

  UPDATE public.orders SET archivado = true
  WHERE creado_en >= p_start AND creado_en <= p_end AND archivado = false
    AND tenant_id IS NOT DISTINCT FROM v_tenant_id;
  GET DIAGNOSTICS v_orders_count = ROW_COUNT;
  UPDATE public.payments SET archivado = true
  WHERE creado_en >= p_start AND creado_en <= p_end AND archivado = false
    AND tenant_id IS NOT DISTINCT FROM v_tenant_id;
  GET DIAGNOSTICS v_payments_count = ROW_COUNT;
  UPDATE public.movements SET archivado = true
  WHERE fecha >= p_start AND fecha <= p_end AND archivado = false
    AND tenant_id IS NOT DISTINCT FROM v_tenant_id;
  GET DIAGNOSTICS v_movs_count = ROW_COUNT;
  RETURN jsonb_build_object('orders', v_orders_count, 'order_items', 0,
    'payments', v_payments_count, 'movements', v_movs_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.desarchivar_mes(p_start TIMESTAMPTZ, p_end TIMESTAMPTZ)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant_id UUID;
  v_orders_count INTEGER;
  v_payments_count INTEGER;
  v_movs_count INTEGER;
BEGIN
  v_tenant_id := public.assert_current_tenant_commercial_access();
  IF NOT EXISTS (
    SELECT 1 FROM public.employees
    WHERE id = auth.uid() AND activo = true AND rol = 'admin'
      AND tenant_id IS NOT DISTINCT FROM v_tenant_id
  ) THEN RAISE EXCEPTION 'Solo admin puede desarchivar meses'; END IF;

  UPDATE public.orders SET archivado = false
  WHERE creado_en >= p_start AND creado_en <= p_end AND archivado = true
    AND tenant_id IS NOT DISTINCT FROM v_tenant_id;
  GET DIAGNOSTICS v_orders_count = ROW_COUNT;
  UPDATE public.payments SET archivado = false
  WHERE creado_en >= p_start AND creado_en <= p_end AND archivado = true
    AND tenant_id IS NOT DISTINCT FROM v_tenant_id;
  GET DIAGNOSTICS v_payments_count = ROW_COUNT;
  UPDATE public.movements SET archivado = false
  WHERE fecha >= p_start AND fecha <= p_end AND archivado = true
    AND tenant_id IS NOT DISTINCT FROM v_tenant_id;
  GET DIAGNOSTICS v_movs_count = ROW_COUNT;
  RETURN jsonb_build_object('orders', v_orders_count, 'order_items', 0,
    'payments', v_payments_count, 'movements', v_movs_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.borrar_mes_permanente(p_start TIMESTAMPTZ, p_end TIMESTAMPTZ)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant_id UUID;
  v_order_ids UUID[];
  v_orders_count INTEGER := 0;
  v_items_count INTEGER := 0;
  v_payments_count INTEGER := 0;
  v_movs_count INTEGER := 0;
BEGIN
  v_tenant_id := public.assert_current_tenant_commercial_access();
  IF NOT EXISTS (
    SELECT 1 FROM public.employees
    WHERE id = auth.uid() AND activo = true AND rol = 'admin'
      AND tenant_id IS NOT DISTINCT FROM v_tenant_id
  ) THEN RAISE EXCEPTION 'Solo admin puede borrar meses permanentemente'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.orders WHERE creado_en >= p_start AND creado_en <= p_end
      AND archivado = true AND tenant_id IS NOT DISTINCT FROM v_tenant_id
  ) AND NOT EXISTS (
    SELECT 1 FROM public.payments WHERE creado_en >= p_start AND creado_en <= p_end
      AND archivado = true AND tenant_id IS NOT DISTINCT FROM v_tenant_id
  ) AND NOT EXISTS (
    SELECT 1 FROM public.movements WHERE fecha >= p_start AND fecha <= p_end
      AND archivado = true AND tenant_id IS NOT DISTINCT FROM v_tenant_id
  ) THEN
    RAISE EXCEPTION 'No hay registros archivados de este negocio en ese período.';
  END IF;

  SELECT array_agg(id) INTO v_order_ids FROM public.orders
  WHERE creado_en >= p_start AND creado_en <= p_end AND archivado = true
    AND tenant_id IS NOT DISTINCT FROM v_tenant_id;

  DELETE FROM public.payments
  WHERE creado_en >= p_start AND creado_en <= p_end AND archivado = true
    AND tenant_id IS NOT DISTINCT FROM v_tenant_id;
  GET DIAGNOSTICS v_payments_count = ROW_COUNT;

  IF v_order_ids IS NOT NULL THEN
    DELETE FROM public.order_items
    WHERE order_id = ANY(v_order_ids)
      AND tenant_id IS NOT DISTINCT FROM v_tenant_id;
    GET DIAGNOSTICS v_items_count = ROW_COUNT;
    DELETE FROM public.orders
    WHERE id = ANY(v_order_ids)
      AND tenant_id IS NOT DISTINCT FROM v_tenant_id;
    GET DIAGNOSTICS v_orders_count = ROW_COUNT;
  END IF;

  DELETE FROM public.movements
  WHERE fecha >= p_start AND fecha <= p_end AND archivado = true
    AND tenant_id IS NOT DISTINCT FROM v_tenant_id;
  GET DIAGNOSTICS v_movs_count = ROW_COUNT;

  RETURN jsonb_build_object('orders', v_orders_count, 'order_items', v_items_count,
    'payments', v_payments_count, 'movements', v_movs_count);
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
