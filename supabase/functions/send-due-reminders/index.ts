import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.3";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Load VAPID config
    const { data: cfg, error: cfgErr } = await supabase
      .from("app_config")
      .select("key,value")
      .in("key", ["vapid_public_key", "vapid_private_key", "vapid_subject"]);
    if (cfgErr) throw cfgErr;
    const cfgMap = Object.fromEntries((cfg ?? []).map((r) => [r.key, r.value]));
    const publicKey = cfgMap.vapid_public_key;
    const privateKey = cfgMap.vapid_private_key;
    const subject = cfgMap.vapid_subject ?? "mailto:notifications@example.com";
    if (!publicKey || !privateKey) throw new Error("VAPID keys missing");

    webpush.setVapidDetails(subject, publicKey, privateKey);

    const nowIso = new Date().toISOString();
    const lowerBoundIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    // Fetch due reminders
    const { data: due, error: dueErr } = await supabase
      .from("reminder_queue")
      .select("*")
      .is("sent_at", null)
      .lte("fire_at", nowIso)
      .gte("fire_at", lowerBoundIso)
      .order("fire_at", { ascending: true })
      .limit(100);
    if (dueErr) throw dueErr;

    if (!due || due.length === 0) {
      return new Response(JSON.stringify({ delivered: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all subscriptions
    const { data: subs, error: subsErr } = await supabase
      .from("push_subscriptions")
      .select("*");
    if (subsErr) throw subsErr;

    let delivered = 0;
    let failed = 0;
    const deadEndpoints: string[] = [];

    for (const r of due) {
      const payload = JSON.stringify({
        title: r.title,
        body: r.body,
        tag: r.tag,
        data: { url: "/", taskId: r.task_id },
      });

      for (const s of subs ?? []) {
        const subscription = {
          endpoint: s.endpoint,
          keys: { p256dh: s.p256dh, auth: s.auth },
        };
        try {
          await webpush.sendNotification(subscription, payload);
          delivered++;
        } catch (err: unknown) {
          failed++;
          const status = (err as { statusCode?: number })?.statusCode;
          if (status === 404 || status === 410) {
            deadEndpoints.push(s.endpoint);
          }
          console.warn("Push failed", status, (err as Error)?.message);
        }
      }

      await supabase
        .from("reminder_queue")
        .update({ sent_at: new Date().toISOString() })
        .eq("id", r.id);
    }

    if (deadEndpoints.length > 0) {
      await supabase.from("push_subscriptions").delete().in("endpoint", deadEndpoints);
    }

    // Cleanup: drop old sent reminders (> 30 days)
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    await supabase
      .from("reminder_queue")
      .delete()
      .not("sent_at", "is", null)
      .lt("sent_at", cutoff);

    return new Response(
      JSON.stringify({ delivered, failed, processed: due.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("send-due-reminders error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
