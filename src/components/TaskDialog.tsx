import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClientTags } from "@/hooks/useClientTags";
import { useCreateTask, useUpdateTask, type Task, type TaskInsert } from "@/hooks/useTasks";
import { toast } from "sonner";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
}

export function TaskDialog({ open, onOpenChange, task }: TaskDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timeEstimate, setTimeEstimate] = useState(30);
  const [status, setStatus] = useState("todo");
  const [clientTagId, setClientTagId] = useState<string | null>(null);
  const [scheduledDate, setScheduledDate] = useState("");

  const { data: tags } = useClientTags();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setTimeEstimate(task.time_estimate);
      setStatus(task.status);
      setClientTagId(task.client_tag_id);
      setScheduledDate(task.scheduled_date || "");
    } else {
      setTitle("");
      setDescription("");
      setTimeEstimate(30);
      setStatus("todo");
      setClientTagId(null);
      setScheduledDate("");
    }
  }, [task, open]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    const payload = {
      title: title.trim(),
      description,
      time_estimate: timeEstimate,
      status,
      client_tag_id: clientTagId,
      scheduled_date: scheduledDate || null,
    };

    try {
      if (task) {
        await updateTask.mutateAsync({ id: task.id, ...payload });
        toast.success("Task updated");
      } else {
        await createTask.mutateAsync(payload as TaskInsert);
        toast.success("Task created");
      }
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const isLoading = createTask.isPending || updateTask.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? "Edit Task" : "New Task"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Task title..." />
          </div>

          <div className="space-y-2">
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional details..." rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="estimate">Time Estimate (min)</Label>
              <Input id="estimate" type="number" min={5} step={5} value={timeEstimate} onChange={e => setTimeEstimate(Number(e.target.value))} />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Client Tag</Label>
              <Select value={clientTagId || "none"} onValueChange={v => setClientTagId(v === "none" ? null : v)}>
                <SelectTrigger><SelectValue placeholder="No tag" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No tag</SelectItem>
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

            <div className="space-y-2">
              <Label htmlFor="date">Scheduled Date</Label>
              <Input id="date" type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Saving..." : task ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
