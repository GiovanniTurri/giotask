import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";

interface Task {
  id: string;
  title: string;
  status: string;
  scheduled_date: string | null;
  scheduled_start_time: string | null;
  time_estimate: number | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      return jsonResponse({ error: "Google OAuth credentials not configured" }, 400);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === "upsert") {
      const taskIds: string[] = body.task_ids || (body.task_id ? [body.task_id] : []);
      if (taskIds.length === 0) {
        return jsonResponse({ error: "task_id or task_ids required" }, 400);
      }

      const { data: tasks, error: tErr } = await supabase
        .from("tasks")
        .select("id, title, status, scheduled_date, scheduled_start_time, time_estimate")
        .in("id", taskIds);
      if (tErr) throw tErr;

      const { data: connections, error: cErr } = await supabase
        .from("google_calendar_connections")
        .select("*")
        .eq("mirror_enabled", true);
      if (cErr) throw cErr;

      let upserted = 0;
      let removed = 0;
      let skipped = 0;

      for (const task of (tasks || []) as Task[]) {
        // If task is unscheduled or done, remove any existing mirrors instead of upserting
        const eligible = task.status !== "done" && !!task.scheduled_date && !!task.scheduled_start_time;

        for (const conn of connections || []) {
          if (!eligible) {
            removed += await deleteMirrorForTask(supabase, task.id, conn, clientId, clientSecret);
            continue;
          }

          try {
            const did = await upsertMirror(supabase, task, conn, clientId, clientSecret);
            if (did) upserted++;
            else skipped++;
          } catch (e) {
            console.error(`Mirror upsert failed for task ${task.id} on conn ${conn.id}:`, e);
          }
        }
      }

      return jsonResponse({ upserted, removed, skipped });
    }

    if (action === "delete") {
      const taskIds: string[] = body.task_ids || (body.task_id ? [body.task_id] : []);
      if (taskIds.length === 0) {
        return jsonResponse({ error: "task_id or task_ids required" }, 400);
      }

      const { data: connections } = await supabase
        .from("google_calendar_connections")
        .select("*");

      let removed = 0;
      for (const taskId of taskIds) {
        for (const conn of connections || []) {
          removed += await deleteMirrorForTask(supabase, taskId, conn, clientId, clientSecret);
        }
      }
      return jsonResponse({ removed });
    }

    if (action === "backfill") {
      const connectionId = body.connection_id as string;
      if (!connectionId) return jsonResponse({ error: "connection_id required" }, 400);

      const { data: conn, error: connErr } = await supabase
        .from("google_calendar_connections")
        .select("*")
        .eq("id", connectionId)
        .single();
      if (connErr || !conn) throw new Error("Connection not found");
      if (!conn.mirror_enabled) return jsonResponse({ error: "Mirror not enabled for this connection" }, 400);

      const { data: tasks, error: tErr } = await supabase
        .from("tasks")
        .select("id, title, status, scheduled_date, scheduled_start_time, time_estimate")
        .neq("status", "done")
        .not("scheduled_date", "is", null)
        .not("scheduled_start_time", "is", null);
      if (tErr) throw tErr;

      let upserted = 0;
      for (const task of (tasks || []) as Task[]) {
        try {
          const did = await upsertMirror(supabase, task, conn, clientId, clientSecret);
          if (did) upserted++;
        } catch (e) {
          console.error(`Backfill upsert failed for task ${task.id}:`, e);
        }
      }
      return jsonResponse({ upserted });
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("google-calendar-mirror error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function upsertMirror(
  supabase: any,
  task: Task,
  conn: any,
  clientId: string,
  clientSecret: string
): Promise<boolean> {
  if (!task.scheduled_date || !task.scheduled_start_time) return false;

  const calendarId = conn.mirror_target_calendar_id || "primary";
  const label = conn.mirror_label || "Focus";
  const visibility = conn.mirror_visibility || "private";
  const minutes = task.time_estimate || 30;

  // Construct ISO start/end. We send them as floating local times by using
  // the Google "dateTime + timeZone" pair so it lands at the right local hour.
  const dateTimePart = `${task.scheduled_date}T${task.scheduled_start_time}`;
  const startDate = new Date(`${dateTimePart}Z`);
  const endDate = new Date(startDate.getTime() + minutes * 60_000);

  // Use the calendar's timezone via Intl by default — but Google accepts a
  // dateTime without offset paired with timeZone field. For simplicity send
  // wall-clock with the user's runtime TZ-equivalent via UTC string and let
  // Google honor it. We send UTC ISO so it's unambiguous.
  const startIso = new Date(`${dateTimePart}`).toISOString();
  const endIso = new Date(new Date(`${dateTimePart}`).getTime() + minutes * 60_000).toISOString();

  const eventBody = {
    summary: label,
    visibility,
    transparency: "opaque",
    start: { dateTime: startIso },
    end: { dateTime: endIso },
    extendedProperties: {
      private: {
        managed_by: "lovable_task_mirror",
        task_id: task.id,
      },
    },
  };

  const accessToken = await getValidAccessToken(conn, supabase, clientId, clientSecret);

  // Look up existing mirror row for this task+connection
  const { data: existing } = await supabase
    .from("task_calendar_mirrors")
    .select("*")
    .eq("task_id", task.id)
    .eq("connection_id", conn.id)
    .maybeSingle();

  if (existing) {
    // PATCH the existing event. If calendar changed, delete old and create new.
    if (existing.calendar_id !== calendarId) {
      await deleteGoogleEvent(accessToken, existing.calendar_id, existing.google_event_id);
      const created = await createGoogleEvent(accessToken, calendarId, eventBody);
      await supabase
        .from("task_calendar_mirrors")
        .update({ calendar_id: calendarId, google_event_id: created.id })
        .eq("id", existing.id);
      return true;
    }

    const patchRes = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(existing.google_event_id)}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventBody),
      }
    );

    if (patchRes.status === 404 || patchRes.status === 410) {
      // Event was deleted on Google's side — recreate.
      const created = await createGoogleEvent(accessToken, calendarId, eventBody);
      await supabase
        .from("task_calendar_mirrors")
        .update({ calendar_id: calendarId, google_event_id: created.id })
        .eq("id", existing.id);
      return true;
    }

    if (!patchRes.ok) {
      const errText = await patchRes.text();
      throw new Error(`PATCH failed [${patchRes.status}]: ${errText}`);
    }
    return true;
  }

  const created = await createGoogleEvent(accessToken, calendarId, eventBody);
  await supabase.from("task_calendar_mirrors").insert({
    task_id: task.id,
    connection_id: conn.id,
    calendar_id: calendarId,
    google_event_id: created.id,
  });
  return true;
}

async function createGoogleEvent(accessToken: string, calendarId: string, eventBody: unknown) {
  const res = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventBody),
    }
  );
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Google event create failed [${res.status}]: ${JSON.stringify(data)}`);
  }
  return data;
}

async function deleteGoogleEvent(accessToken: string, calendarId: string, eventId: string) {
  const res = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  // 404/410 are OK — event already gone
  if (!res.ok && res.status !== 404 && res.status !== 410 && res.status !== 200 && res.status !== 204) {
    const errText = await res.text();
    console.error(`Google event delete failed [${res.status}]: ${errText}`);
  }
}

async function deleteMirrorForTask(
  supabase: any,
  taskId: string,
  conn: any,
  clientId: string,
  clientSecret: string
): Promise<number> {
  const { data: row } = await supabase
    .from("task_calendar_mirrors")
    .select("*")
    .eq("task_id", taskId)
    .eq("connection_id", conn.id)
    .maybeSingle();

  if (!row) return 0;

  try {
    const accessToken = await getValidAccessToken(conn, supabase, clientId, clientSecret);
    await deleteGoogleEvent(accessToken, row.calendar_id, row.google_event_id);
  } catch (e) {
    console.error(`Failed to delete Google event for mirror ${row.id}:`, e);
  }

  await supabase.from("task_calendar_mirrors").delete().eq("id", row.id);
  return 1;
}

async function getValidAccessToken(
  conn: any,
  supabase: any,
  clientId: string,
  clientSecret: string
): Promise<string> {
  if (new Date(conn.token_expires_at) > new Date(Date.now() + 60_000)) {
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

  // mutate so subsequent calls in this request see fresh token
  conn.access_token = data.access_token;
  conn.token_expires_at = expiresAt;

  return data.access_token;
}
