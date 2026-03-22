export interface TaskForScheduler {
  id: string;
  title: string;
  description: string;
  time_estimate_minutes: number;
  priority: number | null;
  status: string;
  tag: string;
  current_date: string | null;
  current_time: string | null;
}

export function buildSystemPrompt(today: string) {
  return `You are an intelligent task scheduling assistant. Today is ${today}.
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
}

export const schedulerToolDef = {
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

export function formatTasksForPrompt(tasks: any[]): TaskForScheduler[] {
  return tasks.map((t: any) => ({
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
}
