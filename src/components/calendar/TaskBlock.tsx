import { cn } from "@/lib/utils";
import type { Task } from "@/hooks/useTasks";

interface TaskBlockProps {
  task: Task & { client_tags?: { name: string; color: string } | null };
  compact?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onClick?: () => void;
}

export function TaskBlock({ task, compact = false, onDragStart, onClick }: TaskBlockProps) {
  const tagColor = task.client_tags?.color || "hsl(var(--primary))";

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className={cn(
        "rounded px-1.5 text-xs font-medium truncate cursor-grab active:cursor-grabbing transition-opacity hover:opacity-90 select-none",
        compact ? "py-0.5" : "py-1",
        task.status === "done" && "opacity-50 line-through"
      )}
      style={{
        backgroundColor: tagColor + "22",
        borderLeft: `3px solid ${tagColor}`,
        color: "hsl(var(--foreground))",
      }}
      title={`${task.title} (${task.time_estimate}m)`}
    >
      {compact ? task.title : `${task.title} · ${task.time_estimate}m`}
    </div>
  );
}
