-- Push subscriptions
CREATE TABLE public.push_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on push_subscriptions"
  ON public.push_subscriptions FOR ALL
  USING (true) WITH CHECK (true);

-- Reminder queue
CREATE TABLE public.reminder_queue (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid NOT NULL,
  fire_at timestamptz NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  tag text NOT NULL,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, fire_at)
);

CREATE INDEX idx_reminder_queue_due ON public.reminder_queue (sent_at, fire_at);

ALTER TABLE public.reminder_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on reminder_queue"
  ON public.reminder_queue FOR ALL
  USING (true) WITH CHECK (true);

-- App config (VAPID keys, etc.)
CREATE TABLE public.app_config (
  key text NOT NULL PRIMARY KEY,
  value text NOT NULL,
  is_public boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Public values readable by anyone; private values only via service role (bypasses RLS)
CREATE POLICY "Public app_config readable"
  ON public.app_config FOR SELECT
  USING (is_public = true);

-- Seed VAPID keys
INSERT INTO public.app_config (key, value, is_public) VALUES
  ('vapid_public_key', 'BLC_Fsh5YjQ7bKgFKRk6ZSNq5EZ4RkTHG38b7Ymtg6GWOG12hcSHMhU9tfJ2zSkRhlBHnmOW8UE8PJW-HS2wQ-0', true),
  ('vapid_private_key', 'C0bg1PW17vXYrroiAKQ6zWlHkAM8g3Nt7bFP_0Mvpb0', false),
  ('vapid_subject', 'mailto:notifications@giotask.lovable.app', false);

-- Cron job to deliver due reminders every minute
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'send-due-reminders-every-minute',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://bldfsqiskvxcbefbtkbe.supabase.co/functions/v1/send-due-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsZGZzcWlza3Z4Y2JlZmJ0a2JlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNjU2MDAsImV4cCI6MjA4OTc0MTYwMH0.tzA3EDOfcixt_RJXiaB_M5xNahsDBXY5ibXw8YcYFW0"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);