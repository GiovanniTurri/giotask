
-- Store Google Calendar OAuth connections
CREATE TABLE public.google_calendar_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  google_email text NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expires_at timestamptz NOT NULL,
  selected_calendars jsonb DEFAULT '[]'::jsonb,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Store imported Google Calendar events
CREATE TABLE public.google_calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid REFERENCES public.google_calendar_connections(id) ON DELETE CASCADE NOT NULL,
  google_event_id text NOT NULL,
  calendar_id text NOT NULL,
  title text NOT NULL,
  description text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  all_day boolean DEFAULT false,
  location text,
  color text DEFAULT '#4285f4',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(connection_id, google_event_id)
);

ALTER TABLE public.google_calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on google_calendar_connections" ON public.google_calendar_connections FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on google_calendar_events" ON public.google_calendar_events FOR ALL USING (true) WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_google_calendar_connections_updated_at
  BEFORE UPDATE ON public.google_calendar_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_google_calendar_events_updated_at
  BEFORE UPDATE ON public.google_calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
