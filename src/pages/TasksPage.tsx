import { useState } from "react";
import { useTasks } from "@/hooks/useTasks";
import { useClientTags } from "@/hooks/useClientTags";
import { TaskCard } from "@/components/TaskCard";
import { TaskDialog } from "@/components/TaskDialog";
import { TagManager } from "@/components/TagManager";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Tags, Loader2 } from "lucide-react";

export default function TasksPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [tagManagerOpen, setTagManagerOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);

  const { data: tasks, isLoading } = useTasks({
    status: statusFilter === "all" ? undefined : statusFilter,
    client_tag_id: tagFilter === "all" ? undefined : tagFilter,
  });
  const { data: tags } = useClientTags();

  const taskCounts = {
    all: tasks?.length ?? 0,
    todo: tasks?.filter(t => t.status === "todo").length ?? 0,
    "in-progress": tasks?.filter(t => t.status === "in-progress").length ?? 0,
    done: tasks?.filter(t => t.status === "done").length ?? 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {taskCounts.all} total · {taskCounts.todo} to do · {taskCounts["in-progress"]} in progress
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setTagManagerOpen(true)}>
            <Tags className="h-4 w-4 mr-1" /> Tags
          </Button>
          <Button size="sm" onClick={() => { setEditingTask(null); setTaskDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> New Task
          </Button>
        </div>
      </div>

      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>

        <Select value={tagFilter} onValueChange={setTagFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tags</SelectItem>
            {tags?.map(t => (
              <SelectItem key={t.id} value={t.id}>
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                  {t.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : tasks && tasks.length > 0 ? (
        <div className="grid gap-3">
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={() => { setEditingTask(task); setTaskDialogOpen(true); }}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-muted-foreground mb-4">No tasks found</p>
          <Button size="sm" onClick={() => { setEditingTask(null); setTaskDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Create your first task
          </Button>
        </div>
      )}

      <TaskDialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen} task={editingTask} />
      <TagManager open={tagManagerOpen} onOpenChange={setTagManagerOpen} />
    </div>
  );
}
