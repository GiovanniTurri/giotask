import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUpdateTask } from "@/hooks/useTasks";
import { toast } from "sonner";

interface ScheduleEntry {
  task_id: string;
  scheduled_date: string;
  scheduled_start_time: string;
  fragment_minutes: number;
}

export function useAiScheduler() {
  const [isScheduling, setIsScheduling] = useState(false);
  const [preview, setPreview] = useState<ScheduleEntry[] | null>(null);
  const updateTask = useUpdateTask();

  const fetchSchedule = async () => {
    setIsScheduling(true);
    try {
      const { data, error } = await supabase.functions.invoke("schedule-tasks");
      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      const schedule: ScheduleEntry[] = data?.schedule || [];
      if (schedule.length === 0) {
        toast.info("No tasks to schedule");
        return;
      }
      setPreview(schedule);
    } catch (e: any) {
      toast.error(e.message || "Failed to generate schedule");
    } finally {
      setIsScheduling(false);
    }
  };

  const applySchedule = async () => {
    if (!preview) return;
    setIsScheduling(true);
    try {
      // Group by task_id and take the first fragment's date/time
      const uniqueTasks = new Map<string, ScheduleEntry>();
      for (const entry of preview) {
        if (!uniqueTasks.has(entry.task_id)) {
          uniqueTasks.set(entry.task_id, entry);
        }
      }

      for (const [taskId, entry] of uniqueTasks) {
        await updateTask.mutateAsync({
          id: taskId,
          scheduled_date: entry.scheduled_date,
          scheduled_start_time: entry.scheduled_start_time,
        });
      }

      toast.success(`Rescheduled ${uniqueTasks.size} tasks`);
      setPreview(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to apply schedule");
    } finally {
      setIsScheduling(false);
    }
  };

  const dismissPreview = () => setPreview(null);

  return { isScheduling, preview, fetchSchedule, applySchedule, dismissPreview };
}
