import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUpdateTask } from "@/hooks/useTasks";
import { useLlmConfig } from "@/hooks/useLlmConfig";
import { buildLocalSystemPrompt, schedulerToolDef, formatTasksForPrompt } from "@/lib/schedulerPrompt";
import { toast } from "sonner";

interface ScheduleEntry {
  task_id: string;
  scheduled_date: string;
  scheduled_start_time: string;
  fragment_minutes: number;
}

function parseScheduleFromResponse(result: any): ScheduleEntry[] {
  const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("No tool call in LLM response");
  const parsed = JSON.parse(toolCall.function.arguments);
  return parsed.schedule || parsed;
}

function extractJsonFromText(text: string): ScheduleEntry[] {
  // Try to find JSON array in markdown code blocks first
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  const jsonStr = codeBlockMatch ? codeBlockMatch[1].trim() : text.trim();

  // Find the first [ and last ] to extract the array
  const start = jsonStr.indexOf("[");
  const end = jsonStr.lastIndexOf("]");
  if (start === -1 || end === -1) throw new Error("No JSON array found in LLM response");

  const parsed = JSON.parse(jsonStr.substring(start, end + 1));
  if (!Array.isArray(parsed)) throw new Error("LLM response is not an array");
  return parsed;
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
    const endpoint = llmConfig?.local_api_endpoint || "http://localhost:1234/v1/chat/completions";
    const model = llmConfig?.local_model || "llama3";

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: buildLocalSystemPrompt(today) },
          { role: "user", content: `Here are the tasks to schedule:\n${JSON.stringify(taskList, null, 2)}` },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Local LLM returned ${response.status}: ${text}`);
    }

    const result = await response.json();

    // Try tool_calls first (for local servers that support it), then fall back to content parsing
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return parsed.schedule || parsed;
    }

    const content = result.choices?.[0]?.message?.content;
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
