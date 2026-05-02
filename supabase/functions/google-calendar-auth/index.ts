import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const SCOPES = "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.email";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: "Google OAuth credentials not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Settings." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // Handle OAuth callback from Google
    if (action === "callback") {
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");
      const appOrigin = url.searchParams.get("state") || "";

      if (error) {
        return new Response(redirectHtml(appOrigin, `error=${encodeURIComponent(error)}`), {
          headers: { "Content-Type": "text/html" },
        });
      }

      if (!code) {
        return new Response(redirectHtml(appOrigin, "error=missing_code"), {
          headers: { "Content-Type": "text/html" },
        });
      }

      const redirectUri = `${supabaseUrl}/functions/v1/google-calendar-auth?action=callback`;

      // Exchange code for tokens
      const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      const tokens = await tokenRes.json();
      if (!tokenRes.ok) {
        console.error("Token exchange failed:", tokens);
        return new Response(redirectHtml(appOrigin, `error=${encodeURIComponent(tokens.error_description || "token_exchange_failed")}`), {
          headers: { "Content-Type": "text/html" },
        });
      }

      // Verify the granted scopes include calendar access
      const grantedScopes = (tokens.scope || "") as string;
      if (!grantedScopes.includes("calendar")) {
        console.error("Calendar scope not granted. Granted:", grantedScopes);
        return new Response(
          redirectHtml(appOrigin, `error=${encodeURIComponent("calendar_scope_not_granted")}`),
          { headers: { "Content-Type": "text/html" } }
        );
      }

      // Get user email
      const userInfoRes = await fetch(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const userInfo = await userInfoRes.json();

      const supabase = createClient(supabaseUrl, supabaseKey);

      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

      // Upsert connection
      const { error: dbError } = await supabase
        .from("google_calendar_connections")
        .upsert(
          {
            google_email: userInfo.email,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            token_expires_at: expiresAt,
          },
          { onConflict: "google_email", ignoreDuplicates: false }
        );

      if (dbError) {
        // If upsert fails due to no unique constraint on email, try insert/update
        const { data: existing } = await supabase
          .from("google_calendar_connections")
          .select("id")
          .eq("google_email", userInfo.email)
          .single();

        if (existing) {
          await supabase
            .from("google_calendar_connections")
            .update({
              access_token: tokens.access_token,
              refresh_token: tokens.refresh_token,
              token_expires_at: expiresAt,
            })
            .eq("id", existing.id);
        } else {
          await supabase.from("google_calendar_connections").insert({
            google_email: userInfo.email,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            token_expires_at: expiresAt,
          });
        }
      }

      return new Response(redirectHtml(appOrigin, "success=true"), {
        headers: { "Content-Type": "text/html" },
      });
    }

    // POST actions
    const body = await req.json().catch(() => ({}));

    if (body.action === "get_auth_url") {
      const redirectUri = `${supabaseUrl}/functions/v1/google-calendar-auth?action=callback`;
      const authUrl = `${GOOGLE_AUTH_URL}?${new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: SCOPES,
        access_type: "offline",
        prompt: "consent",
        include_granted_scopes: "true",
        state: body.origin || "",
      })}`;

      return new Response(JSON.stringify({ url: authUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.action === "disconnect") {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { error: delError } = await supabase
        .from("google_calendar_connections")
        .delete()
        .eq("id", body.connection_id);
      if (delError) throw delError;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.action === "list_calendars") {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data: conn, error: connErr } = await supabase
        .from("google_calendar_connections")
        .select("*")
        .eq("id", body.connection_id)
        .single();
      if (connErr || !conn) throw new Error("Connection not found");

      const accessToken = await getValidAccessToken(conn, supabase, clientId, clientSecret);

      const calRes = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const calData = await calRes.json();
      if (!calRes.ok) throw new Error(calData.error?.message || "Failed to list calendars");

      const calendars = (calData.items || []).map((c: any) => ({
        id: c.id,
        summary: c.summary,
        backgroundColor: c.backgroundColor,
        primary: c.primary || false,
      }));

      return new Response(JSON.stringify({ calendars }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.action === "update_selected_calendars") {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { error: upErr } = await supabase
        .from("google_calendar_connections")
        .update({ selected_calendars: body.calendar_ids })
        .eq("id", body.connection_id);
      if (upErr) throw upErr;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("google-calendar-auth error:", e);
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

  // Refresh the token
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

function redirectHtml(origin: string, params: string) {
  const target = origin ? `${origin}/settings?gcal=${params}` : `about:blank`;
  return `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=${target}"><script>window.location.href="${target}";</script></head><body>Redirecting...</body></html>`;
}
