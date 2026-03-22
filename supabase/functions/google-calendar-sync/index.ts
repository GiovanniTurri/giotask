import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: "Google OAuth credentials not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await req.json().catch(() => ({}));

    // If connection_id provided, sync only that connection; otherwise sync all
    let connections: any[];
    if (body.connection_id) {
      const { data, error } = await supabase
        .from("google_calendar_connections")
        .select("*")
        .eq("id", body.connection_id);
      if (error) throw error;
      connections = data || [];
    } else {
      const { data, error } = await supabase.from("google_calendar_connections").select("*");
      if (error) throw error;
      connections = data || [];
    }

    if (connections.length === 0) {
      return new Response(JSON.stringify({ synced: 0, message: "No connections to sync" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalSynced = 0;

    for (const conn of connections) {
      try {
        const accessToken = await getValidAccessToken(conn, supabase, clientId, clientSecret);
        const selectedCalendars: string[] = conn.selected_calendars || [];

        // If no calendars selected, get primary calendar
        let calendarIds = selectedCalendars.length > 0 ? selectedCalendars : ["primary"];

        const now = new Date();
        const timeMin = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const timeMax = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 60).toISOString(); // Next 60 days

        for (const calendarId of calendarIds) {
          const eventsUrl = `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events?${new URLSearchParams({
            timeMin,
            timeMax,
            singleEvents: "true",
            orderBy: "startTime",
            maxResults: "250",
          })}`;

          const eventsRes = await fetch(eventsUrl, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (!eventsRes.ok) {
            const errText = await eventsRes.text();
            console.error(`Failed to fetch events from ${calendarId}:`, errText);
            continue;
          }

          const eventsData = await eventsRes.json();
          const events = eventsData.items || [];

          for (const event of events) {
            if (event.status === "cancelled") continue;

            const isAllDay = !!event.start?.date;
            const startTime = isAllDay
              ? new Date(event.start.date + "T00:00:00Z").toISOString()
              : event.start?.dateTime;
            const endTime = isAllDay
              ? new Date(event.end.date + "T00:00:00Z").toISOString()
              : event.end?.dateTime;

            if (!startTime || !endTime) continue;

            const row = {
              connection_id: conn.id,
              google_event_id: event.id,
              calendar_id: calendarId,
              title: event.summary || "(No title)",
              description: event.description || null,
              start_time: startTime,
              end_time: endTime,
              all_day: isAllDay,
              location: event.location || null,
              color: event.colorId ? getGoogleColor(event.colorId) : "#4285f4",
            };

            const { error: upsertErr } = await supabase
              .from("google_calendar_events")
              .upsert(row, { onConflict: "connection_id,google_event_id" });

            if (upsertErr) {
              console.error("Upsert error:", upsertErr);
            } else {
              totalSynced++;
            }
          }
        }

        // Update last_synced_at
        await supabase
          .from("google_calendar_connections")
          .update({ last_synced_at: new Date().toISOString() })
          .eq("id", conn.id);
      } catch (connErr) {
        console.error(`Error syncing connection ${conn.id}:`, connErr);
      }
    }

    return new Response(JSON.stringify({ synced: totalSynced }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("google-calendar-sync error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function getValidAccessToken(
  conn: any,
  supabase: any,
  clientId: string,
  clientSecret: string
): Promise<string> {
  if (new Date(conn.token_expires_at) > new Date(Date.now() + 60000)) {
    return conn.access_token;
  }

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: conn.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Token refresh failed: ${data.error_description || data.error}`);

  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
  await supabase
    .from("google_calendar_connections")
    .update({ access_token: data.access_token, token_expires_at: expiresAt })
    .eq("id", conn.id);

  return data.access_token;
}

function getGoogleColor(colorId: string): string {
  const colors: Record<string, string> = {
    "1": "#7986cb", "2": "#33b679", "3": "#8e24aa", "4": "#e67c73",
    "5": "#f6bf26", "6": "#f4511e", "7": "#039be5", "8": "#616161",
    "9": "#3f51b5", "10": "#0b8043", "11": "#d50000",
  };
  return colors[colorId] || "#4285f4";
}
