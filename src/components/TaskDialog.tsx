import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Mail, Plus, Trash2 } from "lucide-react";
import { useClientTags } from "@/hooks/useClientTags";
import { useCreateTask, useUpdateTask, type Task, type TaskInsert } from "@/hooks/useTasks";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  initialValues?: Partial<Pick<TaskInsert, "title" | "description" | "time_estimate" | "client_tag_id" | "scheduled_date" | "scheduled_start_time" | "reminder_minutes">>;
}

type DelayPreset = "1w" | "2w" | "1m" | "custom";

interface FollowUpDraft {
  id: string; // local id (existing db id, or temp)
  dbId?: string; // present if persisted
  delay: DelayPreset;
  customDate: string;
  message: string;
}

const PRESET_LABELS: Record<DelayPreset, string> = {
  "1w": "1 week after",
  "2w": "2 weeks after",
  "1m": "1 month after",
  custom: "Custom date",
};

function addDaysISO(baseISO: string, days: number): string {
  const d = new Date(baseISO + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function addMonthsISO(baseISO: string, months: number): string {
  const d = new Date(baseISO + "T00:00:00");
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function computeFollowUpDate(parentDate: string, fu: FollowUpDraft): string | null {
  if (!parentDate) return fu.delay === "custom" ? fu.customDate || null : null;
  switch (fu.delay) {
    case "1w": return addDaysISO(parentDate, 7);
    case "2w": return addDaysISO(parentDate, 14);
    case "1m": return addMonthsISO(parentDate, 1);
    case "custom": return fu.customDate || null;
  }
}

export function TaskDialog({ open, onOpenChange, task, initialValues }: TaskDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timeEstimate, setTimeEstimate] = useState(30);
  const [status, setStatus] = useState("todo");
  const [clientTagId, setClientTagId] = useState<string | null>(null);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledStartTime, setScheduledStartTime] = useState("");
  const [reminderMinutes, setReminderMinutes] = useState<string>("default");

  const [followUpsEnabled, setFollowUpsEnabled] = useState(false);
  const [followUps, setFollowUps] = useState<FollowUpDraft[]>([]);

  const { data: tags } = useClientTags();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const qc = useQueryClient();

  const isFollowUp = (task as any)?.task_kind === "follow_up";

  useEffect(() => {
    if (!open) return;

    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setTimeEstimate(task.time_estimate);
      setStatus(task.status);
      setClientTagId(task.client_tag_id);
      setScheduledDate(task.scheduled_date || "");
      setScheduledStartTime(task.scheduled_start_time ? task.scheduled_start_time.slice(0, 5) : "");
      const rm = (task as any).reminder_minutes;
      setReminderMinutes(rm == null ? "default" : rm === -1 ? "off" : String(rm));
    } else {
      setTitle(initialValues?.title || "");
      setDescription(initialValues?.description || "");
      setTimeEstimate(initialValues?.time_estimate || 30);
      setStatus("todo");
      setClientTagId(initialValues?.client_tag_id || null);
      setScheduledDate(initialValues?.scheduled_date || "");
      setScheduledStartTime(initialValues?.scheduled_start_time ? initialValues.scheduled_start_time.slice(0, 5) : "");
      const rm = initialValues?.reminder_minutes;
      setReminderMinutes(rm == null ? "default" : rm === -1 ? "off" : String(rm));
      setFollowUpsEnabled(false);
      setFollowUps([]);
    }

    // Load existing follow-ups for this task
    if (task?.id && !isFollowUp) {
      (async () => {
        const { data } = await supabase
          .from("tasks")
          .select("id, scheduled_date, follow_up_message")
          .eq("parent_task_id", task.id);
        if (data && data.length > 0) {
          setFollowUpsEnabled(true);
          setFollowUps(
            data.map((f: any) => ({
              id: f.id,
              dbId: f.id,
              delay: "custom" as DelayPreset,
              customDate: f.scheduled_date || "",
              message: f.follow_up_message || "",
            }))
          );
        } else {
          setFollowUpsEnabled(false);
          setFollowUps([]);
        }
      })();
    }
  }, [task, open, initialValues]);

  const tagName = tags?.find(t => t.id === clientTagId)?.name;

  const defaultMessage = () => {
    const who = tagName ? tagName : "there";
    const what = title || "our recent meeting";
    return `Hi ${who}, hope everything went well after ${what}!`;
  };

  const addFollowUp = () => {
    setFollowUps(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        delay: "1w",
        customDate: "",
        message: defaultMessage(),
      },
    ]);
  };

  const updateFollowUp = (id: string, patch: Partial<FollowUpDraft>) => {
    setFollowUps(prev => prev.map(f => (f.id === id ? { ...f, ...patch } : f)));
  };

  const removeFollowUp = (id: string) => {
    setFollowUps(prev => prev.filter(f => f.id !== id));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!scheduledDate) {
      toast.error("Scheduled date is required");
      return;
    }

    let reminderValue: number | null = null;
    if (reminderMinutes === "off") reminderValue = -1;
    else if (reminderMinutes === "default") reminderValue = null;
    else reminderValue = Number(reminderMinutes);

    const payload = {
      title: title.trim(),
      description,
      time_estimate: timeEstimate,
      status,
      client_tag_id: clientTagId,
      scheduled_date: scheduledDate || null,
      scheduled_start_time: scheduledStartTime ? `${scheduledStartTime}:00` : null,
      reminder_minutes: reminderValue,
    };

    try {
      let parentId: string;
      if (task) {
        const updated = await updateTask.mutateAsync({ id: task.id, ...payload });
        parentId = updated.id;
      } else {
        const created = await createTask.mutateAsync(payload as TaskInsert);
        parentId = created.id;
      }

      // Sync follow-ups (only for non-follow-up parents)
      if (!isFollowUp) {
        const keepIds = new Set<string>();

        if (followUpsEnabled) {
          for (const fu of followUps) {
            const fuDate = computeFollowUpDate(scheduledDate, fu);
            const row: any = {
              title: `Follow up: ${title.trim()}`,
              description: "",
              time_estimate: 15,
              status: "todo",
              client_tag_id: clientTagId,
              scheduled_date: fuDate,
              parent_task_id: parentId,
              task_kind: "follow_up",
              follow_up_message: fu.message,
            };

            if (fu.dbId) {
              const { error } = await supabase.from("tasks").update(row).eq("id", fu.dbId);
              if (error) throw error;
              keepIds.add(fu.dbId);
            } else {
              const { data, error } = await supabase.from("tasks").insert(row).select("id").single();
              if (error) throw error;
              if (data?.id) keepIds.add(data.id);
            }
          }
        }

        // Delete removed follow-ups
        const { data: existing } = await supabase
          .from("tasks")
          .select("id")
          .eq("parent_task_id", parentId);
        const toDelete = (existing || []).filter((e: any) => !keepIds.has(e.id)).map((e: any) => e.id);
        if (toDelete.length > 0) {
          await supabase.from("tasks").delete().in("id", toDelete);
        }

        qc.invalidateQueries({ queryKey: ["tasks"] });
      }

      toast.success(task ? "Task updated" : "Task created");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const isLoading = createTask.isPending || updateTask.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
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

          {isFollowUp && (
            <div className="space-y-2">
              <Label htmlFor="fu-msg" className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> Follow-up message
              </Label>
              <Textarea
                id="fu-msg"
                value={(task as any)?.follow_up_message || ""}
                readOnly
                rows={3}
                className="bg-muted/50"
              />
              <p className="text-xs text-muted-foreground">Edit from the original event task.</p>
            </div>
          )}

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
              <Label htmlFor="date">Scheduled Date <span className="text-destructive">*</span></Label>
              <Input id="date" type="date" required value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="time">Start Time</Label>
              <Input
                id="time"
                type="time"
                value={scheduledStartTime}
                onChange={e => setScheduledStartTime(e.target.value)}
                disabled={!scheduledDate}
              />
            </div>
            <div className="space-y-2">
              <Label>Reminder</Label>
              <Select value={reminderMinutes} onValueChange={setReminderMinutes} disabled={!scheduledStartTime}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Use default</SelectItem>
                  <SelectItem value="off">Off</SelectItem>
                  <SelectItem value="0">At start time</SelectItem>
                  <SelectItem value="5">5 min before</SelectItem>
                  <SelectItem value="10">10 min before</SelectItem>
                  <SelectItem value="15">15 min before</SelectItem>
                  <SelectItem value="30">30 min before</SelectItem>
                  <SelectItem value="60">1 hour before</SelectItem>
                  <SelectItem value="1440">1 day before</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {!isFollowUp && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5 cursor-pointer" htmlFor="fu-toggle">
                    <Mail className="h-4 w-4" /> Follow-up writes
                  </Label>
                  <Switch
                    id="fu-toggle"
                    checked={followUpsEnabled}
                    onCheckedChange={(v) => {
                      setFollowUpsEnabled(v);
                      if (v && followUps.length === 0) addFollowUp();
                    }}
                  />
                </div>

                {followUpsEnabled && (
                  <div className="space-y-3">
                    {followUps.map((fu, idx) => (
                      <div key={fu.id} className="rounded-md border border-border p-3 space-y-2 bg-muted/30">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">Follow-up #{idx + 1}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive"
                            onClick={() => removeFollowUp(fu.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">When</Label>
                            <Select
                              value={fu.delay}
                              onValueChange={(v) => updateFollowUp(fu.id, { delay: v as DelayPreset })}
                            >
                              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {(Object.keys(PRESET_LABELS) as DelayPreset[]).map(k => (
                                  <SelectItem key={k} value={k}>{PRESET_LABELS[k]}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {fu.delay === "custom" && (
                            <div className="space-y-1">
                              <Label className="text-xs">Date</Label>
                              <Input
                                type="date"
                                className="h-8"
                                value={fu.customDate}
                                onChange={(e) => updateFollowUp(fu.id, { customDate: e.target.value })}
                              />
                            </div>
                          )}
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Suggested message</Label>
                          <Textarea
                            rows={2}
                            value={fu.message}
                            onChange={(e) => updateFollowUp(fu.id, { message: e.target.value })}
                          />
                        </div>
                      </div>
                    ))}

                    <Button type="button" variant="outline" size="sm" onClick={addFollowUp} className="w-full">
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add another follow-up
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
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
