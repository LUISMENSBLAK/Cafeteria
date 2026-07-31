-- FASE 1: Esquema multi-tenant

-- 1. Crear tabla tenants
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  nombre_negocio TEXT NOT NULL,
  nombre_contacto TEXT NOT NULL,
  email_contacto TEXT NOT NULL,
  telefono_contacto TEXT,
  creado_en TIMESTAMPTZ DEFAULT now(),
  trial_termina_en TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '15 days'),
  estado TEXT NOT NULL DEFAULT 'trial' CHECK (estado IN ('trial', 'vencido', 'activo')),
  stripe_customer_id TEXT,
  stripe_payment_intent_id TEXT,
  licencia_pagada_en TIMESTAMPTZ,
  theme_color_primario TEXT DEFAULT '#F5E6D3',
  theme_color_secundario TEXT DEFAULT '#7A5A32',
  theme_color_terciario TEXT DEFAULT '#8C8880',
  theme_color_texto TEXT DEFAULT '#111111',
  logo_marca_url TEXT
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- 2. Agregar tenant_id a las tablas operativas PRIMERO
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.tables ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.movements ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.cortes_caja ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.product_price_history ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.notas_diarias ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.order_item_extras ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.product_extras ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.product_ingredients ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- Función segura para obtener el tenant_id del usuario actual sin recursión
-- Se usa plpgsql para evitar errores de parseo estricto antes de que las dependencias estén completamente resueltas.
CREATE OR REPLACE FUNCTION public.get_current_user_tenant_id()
RETURNS UUID AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM public.employees WHERE id = auth.uid() LIMIT 1;
  RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Política para que los usuarios puedan leer los datos de su propio tenant
CREATE POLICY "tenant_can_read_own_row" ON public.tenants FOR SELECT USING (
  id = public.get_current_user_tenant_id()
);

-- 3. Políticas RLS de aislamiento usando AS RESTRICTIVE
CREATE POLICY "tenant_isolation_employees" ON public.employees AS RESTRICTIVE FOR ALL USING (tenant_id IS NOT DISTINCT FROM public.get_current_user_tenant_id());
CREATE POLICY "tenant_isolation_products" ON public.products AS RESTRICTIVE FOR ALL USING (tenant_id IS NOT DISTINCT FROM public.get_current_user_tenant_id());
CREATE POLICY "tenant_isolation_tables" ON public.tables AS RESTRICTIVE FOR ALL USING (tenant_id IS NOT DISTINCT FROM public.get_current_user_tenant_id());
CREATE POLICY "tenant_isolation_orders" ON public.orders AS RESTRICTIVE FOR ALL USING (tenant_id IS NOT DISTINCT FROM public.get_current_user_tenant_id());
CREATE POLICY "tenant_isolation_order_items" ON public.order_items AS RESTRICTIVE FOR ALL USING (tenant_id IS NOT DISTINCT FROM public.get_current_user_tenant_id());
CREATE POLICY "tenant_isolation_payments" ON public.payments AS RESTRICTIVE FOR ALL USING (tenant_id IS NOT DISTINCT FROM public.get_current_user_tenant_id());
CREATE POLICY "tenant_isolation_movements" ON public.movements AS RESTRICTIVE FOR ALL USING (tenant_id IS NOT DISTINCT FROM public.get_current_user_tenant_id());
CREATE POLICY "tenant_isolation_cortes_caja" ON public.cortes_caja AS RESTRICTIVE FOR ALL USING (tenant_id IS NOT DISTINCT FROM public.get_current_user_tenant_id());
CREATE POLICY "tenant_isolation_price_history" ON public.product_price_history AS RESTRICTIVE FOR ALL USING (tenant_id IS NOT DISTINCT FROM public.get_current_user_tenant_id());
CREATE POLICY "tenant_isolation_notas_diarias" ON public.notas_diarias AS RESTRICTIVE FOR ALL USING (tenant_id IS NOT DISTINCT FROM public.get_current_user_tenant_id());
CREATE POLICY "tenant_isolation_categories" ON public.categories AS RESTRICTIVE FOR ALL USING (tenant_id IS NOT DISTINCT FROM public.get_current_user_tenant_id());
CREATE POLICY "tenant_isolation_order_item_extras" ON public.order_item_extras AS RESTRICTIVE FOR ALL USING (tenant_id IS NOT DISTINCT FROM public.get_current_user_tenant_id());
CREATE POLICY "tenant_isolation_product_extras" ON public.product_extras AS RESTRICTIVE FOR ALL USING (tenant_id IS NOT DISTINCT FROM public.get_current_user_tenant_id());
CREATE POLICY "tenant_isolation_product_ingredients" ON public.product_ingredients AS RESTRICTIVE FOR ALL USING (tenant_id IS NOT DISTINCT FROM public.get_current_user_tenant_id());

-- 4. Triggers para autocompletar tenant_id en inserciones
CREATE OR REPLACE FUNCTION public.set_tenant_id_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.get_current_user_tenant_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_set_tenant_id_employees BEFORE INSERT ON public.employees FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert();
CREATE TRIGGER trg_set_tenant_id_products BEFORE INSERT ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert();
CREATE TRIGGER trg_set_tenant_id_tables BEFORE INSERT ON public.tables FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert();
CREATE TRIGGER trg_set_tenant_id_orders BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert();
CREATE TRIGGER trg_set_tenant_id_order_items BEFORE INSERT ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert();
CREATE TRIGGER trg_set_tenant_id_payments BEFORE INSERT ON public.payments FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert();
CREATE TRIGGER trg_set_tenant_id_movements BEFORE INSERT ON public.movements FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert();
CREATE TRIGGER trg_set_tenant_id_cortes_caja BEFORE INSERT ON public.cortes_caja FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert();
CREATE TRIGGER trg_set_tenant_id_product_price_history BEFORE INSERT ON public.product_price_history FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert();
CREATE TRIGGER trg_set_tenant_id_notas_diarias BEFORE INSERT ON public.notas_diarias FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert();
CREATE TRIGGER trg_set_tenant_id_categories BEFORE INSERT ON public.categories FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert();
CREATE TRIGGER trg_set_tenant_id_order_item_extras BEFORE INSERT ON public.order_item_extras FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert();
CREATE TRIGGER trg_set_tenant_id_product_extras BEFORE INSERT ON public.product_extras FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert();
CREATE TRIGGER trg_set_tenant_id_product_ingredients BEFORE INSERT ON public.product_ingredients FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_on_insert();

NOTIFY pgrst, 'reload schema';
