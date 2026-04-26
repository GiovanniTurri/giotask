import { useState, useCallback, useMemo } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, subDays } from "date-fns";
import { useTasks, useUpdateTask } from "@/hooks/useTasks";
import { useGoogleCalendarEvents } from "@/hooks/useGoogleCalendar";
import { useAiScheduler } from "@/hooks/useAiScheduler";
import { CalendarHeader } from "@/components/calendar/CalendarHeader";
import { MonthView } from "@/components/calendar/MonthView";
import { WeekView } from "@/components/calendar/WeekView";
import { DayView } from "@/components/calendar/DayView";
import { SchedulePreview } from "@/components/calendar/SchedulePreview";
import { TaskDialog } from "@/components/TaskDialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, Sparkles, BellRing, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type ViewType = "month" | "week" | "day";

export default function CalendarPage() {
  const [view, setView] = useState<ViewType>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: tasks, isLoading } = useTasks();
  const updateTask = useUpdateTask();
  const { isScheduling, preview, fetchSchedule, applySchedule, dismissPreview } = useAiScheduler();

  // Calculate date range for Google Calendar events based on current view
  const dateRange = useMemo(() => {
    if (view === "month") {
      const ms = startOfWeek(startOfMonth(currentDate));
      const me = endOfWeek(endOfMonth(currentDate));
      return { start: ms.toISOString(), end: me.toISOString() };
    } else if (view === "week") {
      const ws = startOfWeek(currentDate);
      return { start: ws.toISOString(), end: addDays(ws, 7).toISOString() };
    } else {
      return { start: currentDate.toISOString(), end: addDays(currentDate, 1).toISOString() };
    }
  }, [currentDate, view]);

  const { data: googleEvents } = useGoogleCalendarEvents(dateRange.start, dateRange.end);

  const handleDragStart = useCallback((taskId: string) => {
    setDraggingTaskId(taskId);
  }, []);

  const handleDrop = useCallback(
    async (date: string, hour?: number) => {
      if (!draggingTaskId) return;
      try {
        const updates: any = { id: draggingTaskId, scheduled_date: date };
        if (hour !== undefined) {
          updates.scheduled_start_time = `${String(hour).padStart(2, "0")}:00:00`;
        }
        await updateTask.mutateAsync(updates);
        toast.success("Task rescheduled");
      } catch (e: any) {
        toast.error(e.message);
      }
      setDraggingTaskId(null);
    },
    [draggingTaskId, updateTask]
  );

  const handleTaskClick = (task: any) => {
    setEditingTask(task);
    setDialogOpen(true);
  };

  const handleDayClick = (date: Date) => {
    setCurrentDate(date);
    setView("day");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <CalendarHeader
          currentDate={currentDate}
          view={view}
          onDateChange={setCurrentDate}
          onToday={() => setCurrentDate(new Date())}
        />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSchedule}
            disabled={isScheduling}
          >
            {isScheduling ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-1" />
            )}
            Reschedule All
          </Button>
          <Tabs value={view} onValueChange={(v) => setView(v as ViewType)}>
            <TabsList>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="day">Day</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {preview && (
        <SchedulePreview
          schedule={preview}
          tasks={tasks || []}
          onApply={applySchedule}
          onDismiss={dismissPreview}
          isApplying={isScheduling}
        />
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {view === "month" && (
            <MonthView
              currentDate={currentDate}
              tasks={tasks || []}
              googleEvents={googleEvents || []}
              onDragStart={handleDragStart}
              onDrop={handleDrop}
              onTaskClick={handleTaskClick}
              onDayClick={handleDayClick}
            />
          )}
          {view === "week" && (
            <WeekView
              currentDate={currentDate}
              tasks={tasks || []}
              googleEvents={googleEvents || []}
              onDragStart={handleDragStart}
              onDrop={handleDrop}
              onTaskClick={handleTaskClick}
            />
          )}
          {view === "day" && (
            <DayView
              currentDate={currentDate}
              tasks={tasks || []}
              googleEvents={googleEvents || []}
              onDragStart={handleDragStart}
              onDrop={handleDrop}
              onTaskClick={handleTaskClick}
            />
          )}
        </>
      )}

      <TaskDialog open={dialogOpen} onOpenChange={setDialogOpen} task={editingTask} />
    </div>
  );
}
