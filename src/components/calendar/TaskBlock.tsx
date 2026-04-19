import { cn } from "@/lib/utils";
import { Mail } from "lucide-react";
import type { Task } from "@/hooks/useTasks";
import { getTaskAgeStatus, getAgeColor, getAgeLabel } from "@/lib/taskAge";

interface TaskBlockProps {
  task: Task & {
    client_tags?: { name: string; color: string } | null;
    task_kind?: string | null;
    follow_up_message?: string | null;
    parent_task_id?: string | null;
  };
  compact?: boolean;
  showTime?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onClick?: () => void;
}

export function TaskBlock({ task, compact = false, showTime = false, onDragStart, onClick }: TaskBlockProps) {
  const isFollowUp = (task as any).task_kind === "follow_up";
  const { status: ageStatus, daysOverdue } = getTaskAgeStatus(task.scheduled_date, task.status);
  const ageColor = getAgeColor(ageStatus);
  const ageLabel = getAgeLabel(ageStatus);

  const baseColor = ageColor || task.client_tags?.color || "hsl(var(--primary))";

  const overdueText = ageLabel ? `\n⚠ ${ageLabel} (${daysOverdue}d overdue)` : "";
  const titleAttr = isFollowUp
    ? `✉ Follow-up: ${task.title}${task.follow_up_message ? `\n"${task.follow_up_message}"` : ""}${overdueText}`
    : `${task.title} (${task.time_estimate}m)${overdueText}`;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className={cn(
        "rounded px-1.5 text-xs font-medium cursor-grab active:cursor-grabbing transition-opacity hover:opacity-90 select-none overflow-hidden",
        compact ? "py-0.5 truncate" : "py-1 h-full",
        isFollowUp && "border border-dashed",
        task.status === "done" && "opacity-50 line-through"
      )}
      style={{
        backgroundColor: ageColor
          ? `color-mix(in hsl, ${baseColor} 35%, transparent)`
          : baseColor + (isFollowUp ? "11" : "22"),
        borderLeft: `3px solid ${baseColor}`,
        ...(isFollowUp ? { borderColor: baseColor } : {}),
        color: "hsl(var(--foreground))",
      }}
      title={titleAttr}
    >
      {compact ? (
        <span className="flex items-center gap-1 truncate">
          {isFollowUp && <Mail className="h-3 w-3 shrink-0 opacity-70" />}
          {task.title}
        </span>
      ) : (
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="truncate font-semibold flex items-center gap-1">
            {isFollowUp && <Mail className="h-3 w-3 shrink-0 opacity-70" />}
            {task.title}
          </span>
          <span className="text-[10px] opacity-70">
            {showTime && task.scheduled_start_time
              ? `${task.scheduled_start_time.slice(0, 5)} · ${task.time_estimate}m`
              : `${task.time_estimate}m`}
            {ageLabel && ` · ${daysOverdue}d overdue`}
          </span>
        </div>
      )}
    </div>
  );
}
