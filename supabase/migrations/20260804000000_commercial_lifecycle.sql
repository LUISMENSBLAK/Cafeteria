-- ============================================================
-- Innova Coffee POS: ciclo comercial centralizado
-- ============================================================

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS billing_status TEXT,
  ADD COLUMN IF NOT EXISTS plan_type TEXT,
  ADD COLUMN IF NOT EXISTS access_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS grace_period_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT,
  ADD COLUMN IF NOT EXISTS last_payment_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_payment_failed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS billing_updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE public.tenants
SET
  trial_started_at = COALESCE(trial_started_at, creado_en, now()),
  billing_status = COALESCE(
    billing_status,
    CASE estado
      WHEN 'activo' THEN 'active'
      WHEN 'vencido' THEN 'expired'
      ELSE 'trialing'
    END
  ),
  plan_type = COALESCE(
    plan_type,
    CASE plan
      WHEN 'unico' THEN 'one_time'
      WHEN 'mensual' THEN 'monthly'
      ELSE CASE WHEN estado = 'activo' THEN 'one_time' ELSE NULL END
    END
  );

ALTER TABLE public.tenants
  ALTER COLUMN trial_started_at SET DEFAULT now(),
  ALTER COLUMN trial_started_at SET NOT NULL,
  ALTER COLUMN billing_status SET DEFAULT 'trialing',
  ALTER COLUMN billing_status SET NOT NULL;

ALTER TABLE public.tenants
  DROP CONSTRAINT IF EXISTS tenants_billing_status_check,
  DROP CONSTRAINT IF EXISTS tenants_plan_type_check;

ALTER TABLE public.tenants
  ADD CONSTRAINT tenants_billing_status_check CHECK (
    billing_status IN ('trialing', 'active', 'past_due', 'expired', 'canceled', 'suspended')
  ),
  ADD CONSTRAINT tenants_plan_type_check CHECK (
    plan_type IS NULL OR plan_type IN ('one_time', 'monthly')
  );

CREATE INDEX IF NOT EXISTS idx_tenants_billing_status ON public.tenants(billing_status);
CREATE INDEX IF NOT EXISTS idx_tenants_trial_termina_en ON public.tenants(trial_termina_en);
CREATE INDEX IF NOT EXISTS idx_tenants_stripe_customer_id ON public.tenants(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_tenants_stripe_subscription_id ON public.tenants(stripe_subscription_id);

-- Los campos comerciales nunca pueden ser editados desde el navegador.
-- Se conservan únicamente las columnas usadas por la personalización actual.
REVOKE UPDATE ON public.tenants FROM anon, authenticated;
GRANT UPDATE (
  nombre_negocio,
  telefono_contacto,
  theme_color_primario,
  theme_color_secundario,
  theme_color_terciario,
  theme_color_texto,
  logo_marca_url
) ON public.tenants TO authenticated;

-- Bitácora de webhooks. event_id hace idempotente el procesamiento.
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  stripe_created_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'processed', 'failed', 'ignored')),
  attempts INTEGER NOT NULL DEFAULT 1,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  error_code TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stripe_webhook_events FROM anon, authenticated;

-- Bitácora idempotente de correos comerciales y recordatorios.
CREATE TABLE IF NOT EXISTS public.commercial_email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_key TEXT NOT NULL,
  resend_email_id TEXT,
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, event_type, event_key)
);

ALTER TABLE public.commercial_email_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.commercial_email_events FROM anon, authenticated;

-- Compatibilidad con los campos legados `estado` y `plan`.
CREATE OR REPLACE FUNCTION public.sync_legacy_commercial_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.estado := CASE NEW.billing_status
    WHEN 'trialing' THEN 'trial'
    WHEN 'active' THEN 'activo'
    WHEN 'past_due' THEN 'activo'
    ELSE 'vencido'
  END;

  NEW.plan := CASE NEW.plan_type
    WHEN 'one_time' THEN 'unico'
    WHEN 'monthly' THEN 'mensual'
    ELSE NULL
  END;
  NEW.billing_updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_legacy_commercial_fields ON public.tenants;
CREATE TRIGGER trg_sync_legacy_commercial_fields
BEFORE INSERT OR UPDATE OF billing_status, plan_type ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.sync_legacy_commercial_fields();

-- Equivalente SQL de canTenantAccessPOS(). TIMESTAMPTZ se compara como UTC.
CREATE OR REPLACE FUNCTION public.can_tenant_access_pos(
  p_tenant_id UUID,
  p_at TIMESTAMPTZ DEFAULT now()
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT CASE
      WHEN t.billing_status = 'suspended' OR t.suspended_at IS NOT NULL THEN false
      WHEN t.billing_status = 'trialing' THEN t.trial_termina_en > p_at
      WHEN t.billing_status = 'active' AND t.plan_type = 'one_time' THEN true
      WHEN t.billing_status = 'active' AND t.plan_type = 'monthly' THEN
        COALESCE(t.current_period_end, t.access_expires_at) IS NULL
        OR COALESCE(t.current_period_end, t.access_expires_at) > p_at
      WHEN t.billing_status = 'past_due' THEN t.grace_period_ends_at > p_at
      WHEN t.billing_status = 'canceled' THEN
        COALESCE(t.current_period_end, t.access_expires_at) > p_at
      ELSE false
    END
    FROM public.tenants t
    WHERE t.id = p_tenant_id
  ), false);
$$;

REVOKE ALL ON FUNCTION public.can_tenant_access_pos(UUID, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_tenant_access_pos(UUID, TIMESTAMPTZ) TO authenticated, service_role;

-- Capa de datos: aunque una sesión abierta conserve un token válido, las tablas
-- operativas dejan de aceptar lecturas y mutaciones al vencer el acceso.
DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'products', 'tables', 'orders', 'order_items', 'payments', 'movements',
    'cortes_caja', 'product_price_history', 'notas_diarias', 'categories',
    'order_item_extras', 'product_extras', 'product_ingredients'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS commercial_access_guard ON public.%I', table_name);
    EXECUTE format(
      'CREATE POLICY commercial_access_guard ON public.%I AS RESTRICTIVE FOR ALL '
      || 'USING (tenant_id IS NULL OR public.can_tenant_access_pos(tenant_id)) '
      || 'WITH CHECK (tenant_id IS NULL OR public.can_tenant_access_pos(tenant_id))',
      table_name
    );
  END LOOP;
END;
$$;

-- Consulta administrativa futura. No se concede a empleados del tenant.
CREATE OR REPLACE VIEW public.innova_tenant_billing_overview
WITH (security_invoker = true)
AS
SELECT
  id,
  slug,
  nombre_negocio,
  email_contacto,
  billing_status,
  plan_type,
  trial_started_at,
  trial_termina_en,
  stripe_customer_id,
  stripe_subscription_id,
  current_period_end,
  cancel_at_period_end,
  grace_period_ends_at,
  last_payment_at,
  last_payment_failed_at
FROM public.tenants;

REVOKE ALL ON public.innova_tenant_billing_overview FROM anon, authenticated;
GRANT SELECT ON public.innova_tenant_billing_overview TO service_role;

NOTIFY pgrst, 'reload schema';
