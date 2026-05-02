import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface IncomingNote {
  path: string;
  title: string;
  content: string;
  tags: string[];
  is_partner_relevant: boolean;
  source_mtime: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { notes, replace_all = false } = await req.json();
    if (!Array.isArray(notes)) throw new Error("Invalid notes payload");
    if (notes.length > 2000) throw new Error("Too many notes (max 2000 per import)");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const sanitized: IncomingNote[] = notes
      .filter((n: any) => n && typeof n.path === "string" && n.path.length > 0)
      .map((n: any) => ({
        path: String(n.path).slice(0, 500),
        title: String(n.title || "").slice(0, 200),
        content: String(n.content || "").slice(0, 8000),
        tags: Array.isArray(n.tags) ? n.tags.slice(0, 30).map((t: any) => String(t).toLowerCase().slice(0, 60)) : [],
        is_partner_relevant: !!n.is_partner_relevant,
        source_mtime: n.source_mtime || null,
      }));

    if (replace_all) {
      const { error: delErr } = await supabase.from("brain_notes").delete().gte("created_at", "1900-01-01");
      if (delErr) throw delErr;
    }

    if (sanitized.length === 0) {
      return new Response(JSON.stringify({ count: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upsert in batches of 200
    const batchSize = 200;
    let inserted = 0;
    for (let i = 0; i < sanitized.length; i += batchSize) {
      const batch = sanitized.slice(i, i + batchSize);
      const { error } = await supabase
        .from("brain_notes")
        .upsert(batch, { onConflict: "path" });
      if (error) throw error;
      inserted += batch.length;
    }

    // Update brain_config last_imported metadata
    const { data: config } = await supabase.from("brain_config").select("id").limit(1).single();
    if (config?.id) {
      await supabase
        .from("brain_config")
        .update({ last_imported_at: new Date().toISOString(), last_import_count: inserted })
        .eq("id", config.id);
    }

    return new Response(JSON.stringify({ count: inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ingest-brain-notes error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
