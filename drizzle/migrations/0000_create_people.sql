CREATE TABLE public.people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  avatar_url text,
  client_tag_id uuid REFERENCES public.client_tags(id) ON DELETE SET NULL,
  notes text NOT NULL DEFAULT '',
  recontact_every_days integer,
  next_contact_date date,
  last_contacted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.people TO anon, authenticated, service_role;
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on people" ON public.people FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER people_updated_at BEFORE UPDATE ON public.people FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.person_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'other',
  value text NOT NULL DEFAULT '',
  label text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.person_channels TO anon, authenticated, service_role;
ALTER TABLE public.person_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on person_channels" ON public.person_channels FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.person_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  contacted_at timestamptz NOT NULL DEFAULT now(),
  channel_kind text,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.person_contacts TO anon, authenticated, service_role;
ALTER TABLE public.person_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on person_contacts" ON public.person_contacts FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.reminder_queue ADD COLUMN person_id uuid;