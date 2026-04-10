import { cn } from "@/lib/utils";
import type { Task } from "@/hooks/useTasks";

interface TaskBlockProps {
  task: Task & { client_tags?: { name: string; color: string } | null };
  compact?: boolean;
  showTime?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onClick?: () => void;
}

export function TaskBlock({ task, compact = false, showTime = false, onDragStart, onClick }: TaskBlockProps) {
  const tagColor = task.client_tags?.color || "hsl(var(--primary))";

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className={cn(
        "rounded px-1.5 text-xs font-medium cursor-grab active:cursor-grabbing transition-opacity hover:opacity-90 select-none overflow-hidden",
        compact ? "py-0.5 truncate" : "py-1 h-full",
        task.status === "done" && "opacity-50 line-through"
      )}
      style={{
        backgroundColor: tagColor + "22",
        borderLeft: `3px solid ${tagColor}`,
        color: "hsl(var(--foreground))",
      }}
      title={`${task.title} (${task.time_estimate}m)`}
    >
      {compact ? (
        task.title
      ) : (
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="truncate font-semibold">{task.title}</span>
          <span className="text-[10px] opacity-70">
            {showTime && task.scheduled_start_time
              ? `${task.scheduled_start_time.slice(0, 5)} · ${task.time_estimate}m`
              : `${task.time_estimate}m`}
          </span>
        </div>
      )}
    </div>
  );
}
