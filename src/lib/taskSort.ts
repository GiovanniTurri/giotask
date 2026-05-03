import type { Task } from "@/hooks/useTasks";

/**
 * Sort tasks by urgency / time-to-do:
 * 1. Overdue (not done, scheduled date in the past)
 * 2. In progress
 * 3. Future / undated todo
 * 4. Done
 */
export function sortTasksByUrgency<T extends Pick<Task, "status" | "scheduled_date" | "priority" | "updated_at">>(
  tasks: T[]
): T[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();

  const bucketOf = (t: T): number => {
    if (t.status === "done") return 3;
    if (t.status === "in-progress") return 1;
    if (t.scheduled_date) {
      const d = new Date(t.scheduled_date);
      d.setHours(0, 0, 0, 0);
      if (d.getTime() < todayMs) return 0; // overdue
    }
    return 2; // future / undated todo
  };

  const dateMs = (s: string | null | undefined, fallback: number) => {
    if (!s) return fallback;
    const d = new Date(s);
    return isNaN(d.getTime()) ? fallback : d.getTime();
  };

  return [...tasks].sort((a, b) => {
    const ba = bucketOf(a);
    const bb = bucketOf(b);
    if (ba !== bb) return ba - bb;

    if (ba === 3) {
      // done: most recently updated first
      return dateMs(a.updated_at as any, 0) < dateMs(b.updated_at as any, 0) ? 1 : -1;
    }
    if (ba === 0) {
      // overdue: oldest scheduled first (most overdue at top)
      const da = dateMs(a.scheduled_date, Number.MAX_SAFE_INTEGER);
      const db = dateMs(b.scheduled_date, Number.MAX_SAFE_INTEGER);
      if (da !== db) return da - db;
    } else {
      // in-progress / future: soonest first, undated last
      const da = dateMs(a.scheduled_date, Number.MAX_SAFE_INTEGER);
      const db = dateMs(b.scheduled_date, Number.MAX_SAFE_INTEGER);
      if (da !== db) return da - db;
    }
    return (b.priority ?? 0) - (a.priority ?? 0);
  });
}
