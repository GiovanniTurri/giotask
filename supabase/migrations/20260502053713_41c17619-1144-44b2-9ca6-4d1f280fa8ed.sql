
ALTER TABLE public.google_calendar_connections
  ADD COLUMN IF NOT EXISTS granted_scopes text NOT NULL DEFAULT '';
