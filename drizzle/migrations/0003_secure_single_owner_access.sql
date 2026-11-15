CREATE OR REPLACE FUNCTION public.is_app_owner()
RETURNS boolean LANGUAGE sql STABLE SET search_path = ''
AS $$ SELECT auth.uid() = '7d972d9a-fd05-4e83-a292-44597c28340a'::uuid $$;
REVOKE ALL ON FUNCTION public.is_app_owner() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_app_owner() TO authenticated, service_role;

DO $secure$
DECLARE t text; p record;
BEGIN
  FOREACH t IN ARRAY ARRAY['brain_config','brain_notes','client_tags','google_calendar_connections','google_calendar_events','holidays','llm_config','partner_profile','people','person_channels','person_contacts','push_subscriptions','reminder_queue','task_calendar_mirrors','tasks','user_settings','bookings'] LOOP
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', t);
    EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t);
    END LOOP;
    IF t <> 'google_calendar_connections' THEN
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated', t);
    END IF;
    EXECUTE format('CREATE POLICY "Confirmed owner only" ON public.%I FOR ALL TO authenticated USING ((SELECT public.is_app_owner())) WITH CHECK ((SELECT public.is_app_owner()))', t);
  END LOOP;
END $secure$;

DO $columns$
DECLARE c record;
BEGIN
  FOR c IN SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='google_calendar_connections' LOOP
    EXECUTE format('REVOKE ALL (%I) ON public.google_calendar_connections FROM PUBLIC, anon, authenticated', c.column_name);
  END LOOP;
END $columns$;
GRANT SELECT (id, google_email, selected_calendars, last_synced_at, created_at, updated_at, mirror_enabled, mirror_target_calendar_id, mirror_label, mirror_visibility, granted_scopes) ON public.google_calendar_connections TO authenticated;

CREATE TABLE public.google_oauth_states (
  nonce uuid PRIMARY KEY,
  origin text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes')
);
GRANT ALL ON public.google_oauth_states TO service_role;
ALTER TABLE public.google_oauth_states ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.google_oauth_states FROM PUBLIC, anon, authenticated;

DROP POLICY "Public app_config readable" ON public.app_config;
REVOKE ALL ON public.app_config FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.app_config TO anon, authenticated;
GRANT ALL ON public.app_config TO service_role;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public notification key only" ON public.app_config FOR SELECT TO anon, authenticated USING (is_public = true AND key = 'vapid_public_key');