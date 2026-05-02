
ALTER TABLE public.google_calendar_connections
  ADD COLUMN IF NOT EXISTS mirror_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mirror_target_calendar_id text NOT NULL DEFAULT 'primary',
  ADD COLUMN IF NOT EXISTS mirror_label text NOT NULL DEFAULT 'Focus',
  ADD COLUMN IF NOT EXISTS mirror_visibility text NOT NULL DEFAULT 'private';

CREATE TABLE IF NOT EXISTS public.task_calendar_mirrors (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid NOT NULL,
  connection_id uuid NOT NULL,
  calendar_id text NOT NULL,
  google_event_id text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (task_id, connection_id)
);

CREATE INDEX IF NOT EXISTS idx_task_calendar_mirrors_task ON public.task_calendar_mirrors(task_id);
CREATE INDEX IF NOT EXISTS idx_task_calendar_mirrors_connection ON public.task_calendar_mirrors(connection_id);
CREATE INDEX IF NOT EXISTS idx_task_calendar_mirrors_event ON public.task_calendar_mirrors(google_event_id);

ALTER TABLE public.task_calendar_mirrors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on task_calendar_mirrors"
  ON public.task_calendar_mirrors
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER update_task_calendar_mirrors_updated_at
  BEFORE UPDATE ON public.task_calendar_mirrors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
