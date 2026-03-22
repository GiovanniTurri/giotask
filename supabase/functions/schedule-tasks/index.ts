import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get tasks
    const { data: tasks, error: tasksErr } = await supabase
      .from("tasks")
      .select("id, title, description, time_estimate, priority, status, scheduled_date, scheduled_start_time, client_tag_id, client_tags(name)")
      .neq("status", "done")
      .order("priority", { ascending: false });
    if (tasksErr) throw tasksErr;

    if (!tasks || tasks.length === 0) {
      return new Response(JSON.stringify({ schedule: [], message: "No tasks to schedule" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get LLM config
    const { data: config } = await supabase.from("llm_config").select("*").limit(1).single();
    const provider = config?.active_provider || "lovable";

    // Local provider is handled client-side — reject here
    if (provider === "local") {
      return new Response(JSON.stringify({ error: "Local LLM calls are handled in the browser. This edge function only supports lovable and cloud providers." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build prompt
    const today = new Date().toISOString().split("T")[0];
    const taskList = tasks.map((t: any) => ({
      id: t.id,
      title: t.title,
      description: t.description || "",
      time_estimate_minutes: t.time_estimate,
      priority: t.priority,
      status: t.status,
      tag: t.client_tags?.name || "none",
      current_date: t.scheduled_date,
      current_time: t.scheduled_start_time,
    }));

    const systemPrompt = `You are an intelligent task scheduling assistant. Today is ${today}.
Given a list of tasks with time estimates, priorities, and descriptions, produce an optimal schedule.

Rules:
- Schedule tasks across the next 14 days starting from today
- Higher priority tasks should be scheduled sooner
- Working hours are 9:00 to 18:00
- Large tasks (>120 min) MUST be fragmented into smaller blocks across multiple days. Each fragment should be 30-90 minutes.
- Return fragments as separate entries with the SAME task id but different dates/times and a "fragment_minutes" field
- Keep total fragment_minutes equal to the original time_estimate
- Consider task descriptions for urgency clues

Return a JSON array using this tool.`;

    const toolDef = {
      type: "function" as const,
      function: {
        name: "set_schedule",
        description: "Set the optimized task schedule",
        parameters: {
          type: "object",
          properties: {
            schedule: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  task_id: { type: "string" },
                  scheduled_date: { type: "string", description: "YYYY-MM-DD" },
                  scheduled_start_time: { type: "string", description: "HH:MM:SS" },
                  fragment_minutes: { type: "number", description: "Duration of this fragment in minutes" },
                },
                required: ["task_id", "scheduled_date", "scheduled_start_time", "fragment_minutes"],
              },
            },
          },
          required: ["schedule"],
        },
      },
    };

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Here are the tasks to schedule:\n${JSON.stringify(taskList, null, 2)}` },
    ];

    let apiUrl: string;
    let headers: Record<string, string>;
    let model: string;

    if (provider === "lovable") {
      if (!lovableApiKey) throw new Error("LOVABLE_API_KEY is not configured");
      apiUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";
      headers = { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" };
      model = "google/gemini-3-flash-preview";
    } else {
      // cloud provider
      apiUrl = config?.cloud_api_endpoint || "https://api.openai.com/v1/chat/completions";
      headers = { Authorization: `Bearer ${config?.cloud_api_key}`, "Content-Type": "application/json" };
      model = config?.cloud_model || "gpt-4";
    }

    const llmResponse = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages,
        tools: [toolDef],
        tool_choice: { type: "function", function: { name: "set_schedule" } },
      }),
    });

    if (!llmResponse.ok) {
      const status = llmResponse.status;
      const text = await llmResponse.text();
      console.error("LLM error:", status, text);

      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited — please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Settings > Workspace > Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`LLM returned ${status}`);
    }

    const result = await llmResponse.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in LLM response");

    const schedule = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(schedule), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("schedule-tasks error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
