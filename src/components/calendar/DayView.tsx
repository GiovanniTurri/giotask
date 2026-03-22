import { format, isSameDay, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { TaskBlock } from "./TaskBlock";
import type { Task } from "@/hooks/useTasks";

interface DayViewProps {
  currentDate: Date;
  tasks: (Task & { client_tags?: { name: string; color: string } | null })[];
  onDragStart: (taskId: string) => void;
  onDrop: (date: string, hour?: number) => void;
  onTaskClick: (task: any) => void;
}

const HOURS = Array.from({ length: 18 }, (_, i) => i + 5); // 5am - 10pm

export function DayView({ currentDate, tasks, onDragStart, onDrop, onTaskClick }: DayViewProps) {
  const dayTasks = tasks.filter(
    (t) => t.scheduled_date && isSameDay(new Date(t.scheduled_date), currentDate)
  );

  const getTasksForHour = (hour: number) =>
    dayTasks.filter((t) => {
      if (!t.scheduled_start_time) return hour === 9;
      const h = parseInt(t.scheduled_start_time.split(":")[0], 10);
      return h === hour;
    });

  const dateStr = format(currentDate, "yyyy-MM-dd");

  return (
    <div className="border rounded-lg overflow-auto max-h-[calc(100vh-220px)]">
      <div className={cn(
        "px-4 py-3 border-b font-semibold text-sm sticky top-0 z-10 bg-card",
        isToday(currentDate) && "bg-primary/5"
      )}>
        {format(currentDate, "EEEE, MMMM d, yyyy")}
        {isToday(currentDate) && (
          <span className="ml-2 text-xs font-normal text-primary">Today</span>
        )}
      </div>

      {HOURS.map((hour) => {
        const hourTasks = getTasksForHour(hour);
        return (
          <div
            key={hour}
            className="grid grid-cols-[80px_1fr] border-b min-h-[56px]"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(dateStr, hour)}
          >
            <div className="text-xs text-muted-foreground px-3 py-2 border-r text-right">
              {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
            </div>
            <div className="p-1 space-y-1">
              {hourTasks.map((task) => {
                const blocks = Math.max(1, Math.ceil(task.time_estimate / 60));
                return (
                  <div key={task.id} style={{ minHeight: `${blocks * 52}px` }}>
                    <TaskBlock
                      task={task}
                      onDragStart={() => onDragStart(task.id)}
                      onClick={() => onTaskClick(task)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
