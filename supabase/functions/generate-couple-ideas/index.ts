import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractJsonFromText(text: string) {
  let cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const firstArray = cleaned.indexOf("[");
  const firstObject = cleaned.indexOf("{");
  const useArray = firstArray !== -1 && (firstObject === -1 || firstArray < firstObject);
  const start = useArray ? firstArray : firstObject;
  const end = useArray ? cleaned.lastIndexOf("]") : cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON found in LLM response");
  return JSON.parse(cleaned.slice(start, end + 1).replace(/,\s*}/g, "}").replace(/,\s*]/g, "]").replace(/[\x00-\x1F\x7F]/g, ""));
}

function buildMessages(tasks: any[], options: any) {
  const today = new Date().toISOString().slice(0, 10);
  return [
    {
      role: "system",
      content: `You are a tasteful date-planning assistant. Today is ${today}.
Create 3 to 5 creative but practical couple activity task drafts for the user and his girlfriend.
Use past completed activities as inspiration, consider nearby common holidays or seasonal moments, and respect the selected mood, budget, and timing.
Do not book anything, do not claim external availability, and do not create tasks directly.
If tool calling is unavailable, return ONLY valid JSON with a top-level suggestions array.`,
    },
    {
      role: "user",
      content: JSON.stringify({ preferences: options, couple_life_tasks: tasks.slice(0, 30) }, null, 2),
    },
  ];
}

const toolDef = {
  type: "function" as const,
  function: {
    name: "suggest_couple_ideas",
    description: "Return creative couple activity task drafts.",
    parameters: {
      type: "object",
      properties: {
        suggestions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              reason: { type: "string" },
              suggested_date: { type: ["string", "null"] },
              scheduled_start_time: { type: ["string", "null"] },
              duration_minutes: { type: "number" },
              reminder_minutes: { type: ["number", "null"] },
              occasion: { type: ["string", "null"] },
            },
            required: ["title", "description", "reason", "suggested_date", "scheduled_start_time", "duration_minutes", "reminder_minutes", "occasion"],
          },
        },
      },
      required: ["suggestions"],
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { tasks = [], options = {} } = await req.json();
    if (!Array.isArray(tasks)) throw new Error("Invalid tasks payload");

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: config } = await supabase.from("llm_config").select("*").limit(1).single();
    const provider = config?.active_provider || "lovable";
    if (provider === "local") {
      return new Response(JSON.stringify({ error: "Local LLM requests are handled in the browser." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const apiUrl = provider === "lovable" ? "https://ai.gateway.lovable.dev/v1/chat/completions" : config?.cloud_api_endpoint;
    const model = provider === "lovable" ? "google/gemini-3-flash-preview" : config?.cloud_model || "gpt-4";
    const headers = provider === "lovable"
      ? { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" }
      : { Authorization: `Bearer ${config?.cloud_api_key}`, "Content-Type": "application/json" };

    if (provider === "lovable" && !lovableApiKey) throw new Error("Lovable AI is not configured");
    if (!apiUrl) throw new Error("Cloud LLM endpoint is not configured");

    const messages = buildMessages(tasks, options);
    let llmResponse = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ model, messages, tools: [toolDef], tool_choice: provider === "lovable" ? { type: "function", function: { name: "suggest_couple_ideas" } } : undefined, temperature: 0.8 }),
    });

    if (!llmResponse.ok && provider === "cloud") {
      const text = await llmResponse.text();
      if (/tool|function|schema|response_format/i.test(text)) {
        llmResponse = await fetch(apiUrl, { method: "POST", headers, body: JSON.stringify({ model, messages, temperature: 0.8 }) });
      } else {
        throw new Error(`LLM returned ${llmResponse.status}: ${text}`);
      }
    }

    if (!llmResponse.ok) {
      const status = llmResponse.status;
      const text = await llmResponse.text();
      if (status === 429) throw new Error("Rate limited — please try again shortly.");
      if (status === 402) throw new Error("AI credits exhausted. Add funds in Settings > Workspace > Usage.");
      throw new Error(`LLM returned ${status}: ${text}`);
    }

    const result = await llmResponse.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    const content = result.choices?.[0]?.message?.content;
    const parsed = toolCall ? JSON.parse(toolCall.function.arguments) : extractJsonFromText(Array.isArray(content) ? content.map((part: any) => part?.text || "").join("\n") : String(content || ""));

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-couple-ideas error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});