-- Partner profile (single-row table, like llm_config)
CREATE TABLE public.partner_profile (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  display_name text NOT NULL DEFAULT '',
  birthday date,
  anniversary_date date,
  languages text[] NOT NULL DEFAULT '{}',
  loves text[] NOT NULL DEFAULT '{}',
  dislikes text[] NOT NULL DEFAULT '{}',
  food_restrictions text[] NOT NULL DEFAULT '{}',
  budget_default text NOT NULL DEFAULT 'low',
  mood_default text NOT NULL DEFAULT 'romantic',
  love_language text NOT NULL DEFAULT '',
  gift_wishlist text[] NOT NULL DEFAULT '{}',
  favorite_places text[] NOT NULL DEFAULT '{}',
  clothing_sizes text NOT NULL DEFAULT '',
  favorite_brands_artists text[] NOT NULL DEFAULT '{}',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on partner_profile" ON public.partner_profile FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_partner_profile_updated_at
  BEFORE UPDATE ON public.partner_profile
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Brain notes imported from Obsidian vault subfolder
CREATE TABLE public.brain_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  path text NOT NULL UNIQUE,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  is_partner_relevant boolean NOT NULL DEFAULT false,
  source_mtime timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.brain_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on brain_notes" ON public.brain_notes FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_brain_notes_partner_relevant ON public.brain_notes(is_partner_relevant) WHERE is_partner_relevant = true;
CREATE INDEX idx_brain_notes_updated ON public.brain_notes(updated_at DESC);

CREATE TRIGGER update_brain_notes_updated_at
  BEFORE UPDATE ON public.brain_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Brain config (subfolder filter, last import metadata)
CREATE TABLE public.brain_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vault_subfolder text NOT NULL DEFAULT '',
  partner_keywords text[] NOT NULL DEFAULT '{couple,partner,girlfriend,coppia,fidanzata}',
  last_imported_at timestamptz,
  last_import_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.brain_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on brain_config" ON public.brain_config FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_brain_config_updated_at
  BEFORE UPDATE ON public.brain_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();