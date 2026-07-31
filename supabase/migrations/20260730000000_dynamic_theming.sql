ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS theme_color_primario TEXT DEFAULT '#F5E6D3';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS theme_color_secundario TEXT DEFAULT '#7A5A32';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS theme_color_terciario TEXT DEFAULT '#8C8880';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS theme_color_texto TEXT DEFAULT '#111111';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS logo_marca_url TEXT;
NOTIFY pgrst, 'reload schema';
