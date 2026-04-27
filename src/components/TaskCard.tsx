import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Clock, Calendar, Pencil, Trash2, Mail, ChevronDown, ChevronRight, AlertTriangle, Bell } from "lucide-react";
import { useDeleteTask, useRestoreTask, useUpdateTask } from "@/hooks/useTasks";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getTaskAgeStatus, getAgeColor, getAgeLabel } from "@/lib/taskAge";

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
  const restoreTask = useRestoreTask();
  const updateTask = useUpdateTask();

  const isFollowUp = task.task_kind === "follow_up";
  const [parentTitle, setParentTitle] = useState<string | null>(null);
  const [followUps, setFollowUps] = useState<Array<{ id: string; title: string; scheduled_date: string | null; follow_up_message: string | null }>>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (isFollowUp && task.parent_task_id) {
      supabase.from("tasks").select("title").eq("id", task.parent_task_id).maybeSingle().then(({ data }) => {
        if (!cancelled && data) setParentTitle(data.title);
      });
    } else if (!isFollowUp) {
      supabase
        .from("tasks")
        .select("id, title, scheduled_date, follow_up_message")
        .eq("parent_task_id", task.id)
        .order("scheduled_date", { ascending: true })
        .then(({ data }) => {
          if (!cancelled && data) setFollowUps(data as any);
        });
    }
    return () => { cancelled = true; };
  }, [task.id, task.parent_task_id, isFollowUp]);

  const handleDelete = async () => {
    try {
      const snapshot = await deleteTask.mutateAsync(task.id);
      toast.success("Task deleted", {
        duration: 6000,
        action: snapshot
          ? {
              label: "Undo",
              onClick: async () => {
                try {
                  await restoreTask.mutateAsync(snapshot);
                  toast.success("Task restored");
                } catch (err: any) {
                  toast.error(err.message || "Failed to restore task");
                }
              },
            }
          : undefined,
      });
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
  const { status: ageStatus, daysOverdue } = getTaskAgeStatus(task.scheduled_date, task.status);
  const ageColor = getAgeColor(ageStatus);
  const ageLabel = getAgeLabel(ageStatus);

  return (
    <Card
      className={cn(
        "border-l-4 p-4 transition-shadow hover:shadow-md",
        !ageColor && (statusStyles[task.status] || "border-l-muted"),
        isFollowUp && "border-dashed"
      )}
      style={ageColor ? { borderLeftColor: ageColor } : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {isFollowUp && <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
            <h3 className={cn("font-semibold text-sm", task.status === "done" && "line-through text-muted-foreground")}>
              {task.title}
            </h3>
            {tag && (
              <Badge className="text-[10px] px-1.5 py-0" style={{ backgroundColor: tag.color, color: "#fff", borderColor: tag.color }}>
                {tag.name}
              </Badge>
            )}
            {ageLabel && (
              <Badge
                className="text-[10px] px-1.5 py-0 gap-1 border-transparent text-white"
                style={{ backgroundColor: ageColor! }}
              >
                <AlertTriangle className="h-2.5 w-2.5" />
                {daysOverdue}d overdue
              </Badge>
            )}
            {!isFollowUp && followUps.length > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1">
                <Mail className="h-2.5 w-2.5" />
                {followUps.length} follow-up{followUps.length > 1 ? "s" : ""}
              </Badge>
            )}
          </div>

          {isFollowUp && parentTitle && (
            <p className="text-xs text-muted-foreground mb-1">
              Follow-up to: <span className="font-medium">{parentTitle}</span>
            </p>
          )}

          {isFollowUp && task.follow_up_message && (
            <p className="text-xs italic text-muted-foreground mb-2 border-l-2 border-muted pl-2">
              "{task.follow_up_message}"
            </p>
          )}

          {!isFollowUp && task.description && (
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
                {task.scheduled_start_time && ` · ${task.scheduled_start_time.slice(0, 5)}`}
              </span>
            )}
            {task.reminder_minutes != null && task.scheduled_start_time && (
              <span className="flex items-center gap-1" title={`Reminder ${task.reminder_minutes} min before`}>
                <Bell className="h-3 w-3" />
                {task.reminder_minutes}m
              </span>
            )}
            <button onClick={cycleStatus} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted hover:bg-muted/80 transition-colors">
              {statusLabels[task.status]}
            </button>
            {!isFollowUp && followUps.length > 0 && (
              <button
                onClick={() => setExpanded(e => !e)}
                className="flex items-center gap-0.5 text-[10px] hover:text-foreground transition-colors"
              >
                {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                {expanded ? "Hide" : "Show"} follow-ups
              </button>
            )}
          </div>

          {!isFollowUp && expanded && followUps.length > 0 && (
            <div className="mt-3 space-y-1.5 pl-3 border-l border-dashed border-border">
              {followUps.map(fu => (
                <div key={fu.id} className="text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <span>{fu.scheduled_date ? new Date(fu.scheduled_date).toLocaleDateString() : "Unscheduled"}</span>
                  </div>
                  {fu.follow_up_message && (
                    <p className="italic text-muted-foreground/80 truncate ml-4.5 pl-1">"{fu.follow_up_message}"</p>
                  )}
                </div>
              ))}
            </div>
          )}
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
