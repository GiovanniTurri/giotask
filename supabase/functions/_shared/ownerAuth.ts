import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { ownerAccessStatus } from "./ownerAccess.ts";

/** Only explicitly internal-capable functions accept service/cron credentials. */
export async function requireOwner(req: Request, allowInternal = false): Promise<Response | null> {
  const status = await ownerAccessStatus(req.headers.get("Authorization"), async (token) => {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_ANON_KEY");
    if (!url || !key) throw new Error("Auth not configured");
    const client = createClient(url, key, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) throw new Error("Invalid session");
    const owner = await client.rpc("is_app_owner");
    return !owner.error && owner.data === true;
  }, allowInternal ? [
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    Deno.env.get("LOVABLE_CRON_SECRET"),
    Deno.env.get("LOVABLE_CRON_SECRET_PREVIOUS"),
  ] : []);
  return status === 200 ? null : new Response(JSON.stringify({ error: status === 403 ? "Owner access required" : "Unauthorized" }), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}