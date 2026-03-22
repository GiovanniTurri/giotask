import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Clock, Calendar, Pencil, Trash2 } from "lucide-react";
import { useDeleteTask, useUpdateTask } from "@/hooks/useTasks";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: any;
  onEdit: () => void;
}

const statusStyles: Record<string, string> = {
  "todo": "border-l-muted-foreground",
  "in-progress": "border-l-primary",
  "done": "border-l-accent",
};

const statusLabels: Record<string, string> = {
  "todo": "To Do",
  "in-progress": "In Progress",
  "done": "Done",
};

export function TaskCard({ task, onEdit }: TaskCardProps) {
  const deleteTask = useDeleteTask();
  const updateTask = useUpdateTask();

  const handleDelete = async () => {
    try {
      await deleteTask.mutateAsync(task.id);
      toast.success("Task deleted");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const cycleStatus = async () => {
    const order = ["todo", "in-progress", "done"];
    const next = order[(order.indexOf(task.status) + 1) % 3];
    await updateTask.mutateAsync({ id: task.id, status: next });
  };

  const tag = task.client_tags;

  return (
    <Card className={cn("border-l-4 p-4 transition-shadow hover:shadow-md", statusStyles[task.status] || "border-l-muted")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className={cn("font-semibold text-sm", task.status === "done" && "line-through text-muted-foreground")}>
              {task.title}
            </h3>
            {tag && (
              <Badge className="text-[10px] px-1.5 py-0" style={{ backgroundColor: tag.color, color: "#fff", borderColor: tag.color }}>
                {tag.name}
              </Badge>
            )}
          </div>

          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{task.description}</p>
          )}

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {task.time_estimate}m
            </span>
            {task.scheduled_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(task.scheduled_date).toLocaleDateString()}
              </span>
            )}
            <button onClick={cycleStatus} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted hover:bg-muted/80 transition-colors">
              {statusLabels[task.status]}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={handleDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
