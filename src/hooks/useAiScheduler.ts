import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUpdateTask } from "@/hooks/useTasks";
import { useLlmConfig } from "@/hooks/useLlmConfig";
import { buildLocalSystemPrompt, formatTasksForPrompt } from "@/lib/schedulerPrompt";
import { toast } from "sonner";

interface ScheduleEntry {
  task_id: string;
  scheduled_date: string;
  scheduled_start_time: string;
  fragment_minutes: number;
}

const LOCAL_LLM_DEFAULT_ENDPOINT = "http://localhost:1234/v1/chat/completions";

function normalizeLocalEndpoint(endpoint?: string | null) {
  const trimmed = endpoint?.trim();

  if (!trimmed) return LOCAL_LLM_DEFAULT_ENDPOINT;
  if (/\/v1\/chat\/completions\/?$/i.test(trimmed)) return trimmed;
  if (/\/v1\/?$/i.test(trimmed)) return `${trimmed.replace(/\/$/, "")}/chat/completions`;
  if (/^https?:\/\/[^/]+(?::\d+)?\/?$/i.test(trimmed)) return `${trimmed.replace(/\/$/, "")}/v1/chat/completions`;

  return trimmed;
}

function parseSchedulePayload(parsed: unknown): ScheduleEntry[] {
  if (Array.isArray(parsed)) return parsed as ScheduleEntry[];
  if (parsed && typeof parsed === "object" && Array.isArray((parsed as { schedule?: unknown }).schedule)) {
    return (parsed as { schedule: ScheduleEntry[] }).schedule;
  }

  throw new Error("LLM response did not contain a valid schedule array");
}

function extractMessageText(content: unknown): string {
  if (typeof content === "string") return content;

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part && typeof part.text === "string") {
          return part.text;
        }
        return "";
      })
      .join("\n")
      .trim();
  }

  return "";
}

function extractJsonFromText(text: string): ScheduleEntry[] {
  let cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  const firstArray = cleaned.indexOf("[");
  const firstObject = cleaned.indexOf("{");
  const useArray = firstArray !== -1 && (firstObject === -1 || firstArray < firstObject);
  const start = useArray ? firstArray : firstObject;
  const end = useArray ? cleaned.lastIndexOf("]") : cleaned.lastIndexOf("}");

  if (start === -1 || end === -1) throw new Error("No JSON found in LLM response");

  cleaned = cleaned.slice(start, end + 1);

  try {
    return parseSchedulePayload(JSON.parse(cleaned));
  } catch {
    const sanitized = cleaned
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]")
      .replace(/[\x00-\x1F\x7F]/g, "");

    return parseSchedulePayload(JSON.parse(sanitized));
  }
}

export function useAiScheduler() {
  const [isScheduling, setIsScheduling] = useState(false);
  const [preview, setPreview] = useState<ScheduleEntry[] | null>(null);
  const updateTask = useUpdateTask();
  const { data: llmConfig } = useLlmConfig();

  const fetchLocalSchedule = async (): Promise<ScheduleEntry[]> => {
    const { data: tasks, error } = await supabase
      .from("tasks")
      .select("id, title, description, time_estimate, priority, status, scheduled_date, scheduled_start_time, client_tag_id, client_tags(name)")
      .neq("status", "done")
      .order("priority", { ascending: false });
    if (error) throw error;
    if (!tasks || tasks.length === 0) return [];

    const today = new Date().toISOString().split("T")[0];
    const taskList = formatTasksForPrompt(tasks);
    const endpoint = normalizeLocalEndpoint(llmConfig?.local_api_endpoint);
    const model = llmConfig?.local_model || "llama3";
    const messages = [
      { role: "system", content: buildLocalSystemPrompt(today) },
      { role: "user", content: `Here are the tasks to schedule:\n${JSON.stringify(taskList, null, 2)}` },
    ];
    const fallbackSingleMessage = [
      {
        role: "user",
        content: `${buildLocalSystemPrompt(today)}\n\nHere are the tasks to schedule:\n${JSON.stringify(taskList, null, 2)}`,
      },
    ];

    const payloadAttempts = [
      { model, messages, temperature: 0.2, stream: false },
      { model, messages: fallbackSingleMessage, temperature: 0.2, stream: false },
    ];

    let response: Response | null = null;
    let lastErrorText = "";

    for (const payload of payloadAttempts) {
      response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) break;

      lastErrorText = await response.text();
      if (!/messages|content|role/i.test(lastErrorText)) break;
    }

    if (!response || !response.ok) {
      throw new Error(`Local LLM returned ${response?.status ?? "unknown"}: ${lastErrorText || "Empty response"}`);
    }

    const result = await response.json();

    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall) {
      return parseSchedulePayload(JSON.parse(toolCall.function.arguments));
    }

    const content = extractMessageText(result.choices?.[0]?.message?.content);
    if (content) {
      return extractJsonFromText(content);
    }

    throw new Error("No usable response from local LLM");
  };

  const fetchSchedule = async () => {
    setIsScheduling(true);
    try {
      const provider = llmConfig?.active_provider || "lovable";

      let schedule: ScheduleEntry[];

      if (provider === "local") {
        // Call local LLM directly from the browser
        schedule = await fetchLocalSchedule();
      } else {
        // Use the edge function for lovable/cloud providers
        const { data, error } = await supabase.functions.invoke("schedule-tasks");
        if (error) throw error;
        if (data?.error) {
          toast.error(data.error);
          return;
        }
        schedule = data?.schedule || [];
      }

      if (schedule.length === 0) {
        toast.info("No tasks to schedule");
        return;
      }
      setPreview(schedule);
    } catch (e: any) {
      toast.error(e.message || "Failed to generate schedule");
    } finally {
      setIsScheduling(false);
    }
  };

  const applySchedule = async () => {
    if (!preview) return;
    setIsScheduling(true);
    try {
      const uniqueTasks = new Map<string, ScheduleEntry>();
      for (const entry of preview) {
        if (!uniqueTasks.has(entry.task_id)) {
          uniqueTasks.set(entry.task_id, entry);
        }
      }

      for (const [taskId, entry] of uniqueTasks) {
        await updateTask.mutateAsync({
          id: taskId,
          scheduled_date: entry.scheduled_date,
          scheduled_start_time: entry.scheduled_start_time,
        });
      }

      // Batch-mirror all rescheduled tasks to linked Google Calendars
      try {
        await supabase.functions.invoke("google-calendar-mirror", {
          body: { action: "upsert", task_ids: Array.from(uniqueTasks.keys()) },
        });
      } catch (e) {
        console.warn("Mirror batch upsert failed:", e);
      }

      toast.success(`Rescheduled ${uniqueTasks.size} tasks`);
      setPreview(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to apply schedule");
    } finally {
      setIsScheduling(false);
    }
  };

  const dismissPreview = () => setPreview(null);

  return { isScheduling, preview, fetchSchedule, applySchedule, dismissPreview };
}
