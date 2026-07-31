-- ============================================================
-- FIX: Multi-tenant constraints and 14-day trial
-- ============================================================

-- Mesas: único por negocio, no global
ALTER TABLE public.tables DROP CONSTRAINT IF EXISTS tables_numero_key;
ALTER TABLE public.tables ADD CONSTRAINT tables_numero_tenant_unique UNIQUE (tenant_id, numero);

-- Categorías: único por negocio, no global
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_nombre_key;
ALTER TABLE public.categories ADD CONSTRAINT categories_nombre_tenant_unique UNIQUE (tenant_id, nombre);

-- PINs de empleados: único por negocio, no global
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_pin_key;
ALTER TABLE public.employees ADD CONSTRAINT employees_pin_tenant_unique UNIQUE (tenant_id, pin);

-- Trial: 14 días en vez de 15
ALTER TABLE public.tenants ALTER COLUMN trial_termina_en SET DEFAULT (now() + interval '14 days');

-- Política de UPDATE que falta en tenants (el panel de Personalización la necesita)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'tenants' AND policyname = 'tenant_can_update_own_row'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "tenant_can_update_own_row" ON public.tenants FOR UPDATE USING (
        id = public.get_current_user_tenant_id()
      ) WITH CHECK (
        id = public.get_current_user_tenant_id()
      )
    $policy$;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
