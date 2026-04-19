export type TaskAgeStatus = "fresh" | "warn7" | "warn14" | "critical21";

export function getTaskAgeStatus(
  scheduled_date: string | null | undefined,
  status: string | null | undefined
): { status: TaskAgeStatus; daysOverdue: number } {
  if (!scheduled_date || status === "done") {
    return { status: "fresh", daysOverdue: 0 };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const scheduled = new Date(scheduled_date);
  scheduled.setHours(0, 0, 0, 0);
  const daysOverdue = Math.floor((today.getTime() - scheduled.getTime()) / (1000 * 60 * 60 * 24));

  if (daysOverdue >= 21) return { status: "critical21", daysOverdue };
  if (daysOverdue >= 14) return { status: "warn14", daysOverdue };
  if (daysOverdue >= 7) return { status: "warn7", daysOverdue };
  return { status: "fresh", daysOverdue: Math.max(0, daysOverdue) };
}

/** Returns an HSL color string (with hsl(var(--token))) or null if fresh */
export function getAgeColor(status: TaskAgeStatus): string | null {
  switch (status) {
    case "warn7":
      return "hsl(var(--task-age-warn))";
    case "warn14":
      return "hsl(var(--task-age-stale))";
    case "critical21":
      return "hsl(var(--task-age-critical))";
    default:
      return null;
  }
}

export function getAgeLabel(status: TaskAgeStatus): string | null {
  switch (status) {
    case "warn7":
      return "Needs attention";
    case "warn14":
      return "Getting stale";
    case "critical21":
      return "Critical";
    default:
      return null;
  }
}
