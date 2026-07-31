ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS plan TEXT CHECK (plan IN ('mensual', 'unico'));

NOTIFY pgrst, 'reload schema';
