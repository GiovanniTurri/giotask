ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS reminder_minutes integer;

CREATE TABLE IF NOT EXISTS public.user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  default_reminder_minutes integer DEFAULT 10,
  notifications_enabled boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on user_settings" ON public.user_settings;
CREATE POLICY "Allow all on user_settings" ON public.user_settings FOR ALL USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS set_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER set_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.user_settings (default_reminder_minutes, notifications_enabled)
SELECT 10, true
WHERE NOT EXISTS (SELECT 1 FROM public.user_settings);