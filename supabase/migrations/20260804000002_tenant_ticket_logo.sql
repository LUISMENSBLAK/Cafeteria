-- El logo del ticket debe pertenecer a cada negocio, no a settings global.
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS ticket_logo_url TEXT;

-- Los tenants existentes comienzan usando el logo cargado durante su registro.
UPDATE public.tenants
SET ticket_logo_url = logo_marca_url
WHERE ticket_logo_url IS NULL
  AND logo_marca_url IS NOT NULL;

-- La política RLS existente limita la actualización al tenant del usuario actual.
GRANT UPDATE (ticket_logo_url) ON public.tenants TO authenticated;

NOTIFY pgrst, 'reload schema';
