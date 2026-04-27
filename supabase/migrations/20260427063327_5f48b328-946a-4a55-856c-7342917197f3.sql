-- Create holidays table
CREATE TABLE public.holidays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  month INT NOT NULL,
  day INT NOT NULL,
  year INT,
  recurring BOOLEAN NOT NULL DEFAULT true,
  kind TEXT NOT NULL DEFAULT 'holiday',
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  is_builtin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Validation trigger (using a trigger instead of CHECK so we can validate
-- the recurring/year relationship together)
CREATE OR REPLACE FUNCTION public.validate_holiday()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.month < 1 OR NEW.month > 12 THEN
    RAISE EXCEPTION 'Month must be between 1 and 12';
  END IF;
  IF NEW.day < 1 OR NEW.day > 31 THEN
    RAISE EXCEPTION 'Day must be between 1 and 31';
  END IF;
  IF NEW.recurring = false AND NEW.year IS NULL THEN
    RAISE EXCEPTION 'Year is required for non-recurring holidays';
  END IF;
  IF NEW.kind NOT IN ('holiday', 'anniversary') THEN
    RAISE EXCEPTION 'Kind must be holiday or anniversary';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER holidays_validate
  BEFORE INSERT OR UPDATE ON public.holidays
  FOR EACH ROW EXECUTE FUNCTION public.validate_holiday();

-- updated_at trigger
CREATE TRIGGER holidays_set_updated_at
  BEFORE UPDATE ON public.holidays
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS with permissive policy (matches existing project pattern)
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on holidays"
  ON public.holidays
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Seed the previously hardcoded holidays as built-ins
INSERT INTO public.holidays (name, month, day, year, recurring, kind, title, description, is_builtin) VALUES
  ('Valentine''s Day', 2, 14, NULL, true, 'holiday',
    'Plan a Valentine''s date night',
    'Book a relaxed dinner, a shared dessert stop, or a small surprise walk together.', true),
  ('International Women''s Day', 3, 8, NULL, true, 'holiday',
    'Prepare a thoughtful Women''s Day moment',
    'Plan flowers, a handwritten note, or a calm evening around something she likes.', true),
  ('April 23', 4, 23, NULL, true, 'anniversary',
    'Create an April 23 memory',
    'Use this date as a small relationship checkpoint: dinner, photos, or a meaningful walk.', true),
  ('April 25', 4, 25, NULL, true, 'holiday',
    'Plan an April 25 day together',
    'Schedule a day trip, brunch, or outdoor activity if you both have time free.', true),
  ('Easter', 4, 5, 2026, false, 'holiday',
    'Choose a spring weekend activity',
    'Plan a picnic, garden walk, museum visit, or a quiet brunch during the Easter period.', true),
  ('Summer', 6, 21, NULL, true, 'holiday',
    'Schedule a summer picnic',
    'Pick a park, beach, or sunset spot and keep the plan light and easy.', true),
  ('Halloween', 10, 31, NULL, true, 'holiday',
    'Plan a cozy Halloween evening',
    'Choose a movie night, themed cooking, or a relaxed evening at home.', true),
  ('Christmas', 12, 25, NULL, true, 'holiday',
    'Plan a Christmas moment',
    'Prepare a festive walk, gift exchange, dinner, or visit to seasonal lights.', true),
  ('New Year', 12, 31, NULL, true, 'holiday',
    'Plan New Year''s Eve together',
    'Reserve time for dinner, reflections, and a small shared goal for the next year.', true);