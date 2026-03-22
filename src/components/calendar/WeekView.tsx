import { startOfWeek, addDays, format, isSameDay, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { TaskBlock } from "./TaskBlock";
import type { Task } from "@/hooks/useTasks";

interface WeekViewProps {
  currentDate: Date;
  tasks: (Task & { client_tags?: { name: string; color: string } | null })[];
  onDragStart: (taskId: string) => void;
  onDrop: (date: string, hour?: number) => void;
  onTaskClick: (task: any) => void;
}

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6am - 9pm

export function WeekView({ currentDate, tasks, onDragStart, onDrop, onTaskClick }: WeekViewProps) {
  const weekStart = startOfWeek(currentDate);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getTasksForDay = (day: Date) =>
    tasks.filter((t) => t.scheduled_date && isSameDay(new Date(t.scheduled_date), day));

  const getTasksForHour = (day: Date, hour: number) =>
    getTasksForDay(day).filter((t) => {
      if (!t.scheduled_start_time) return hour === 9; // default to 9am
      const h = parseInt(t.scheduled_start_time.split(":")[0], 10);
      return h === hour;
    });

  return (
    <div className="border rounded-lg overflow-auto max-h-[calc(100vh-220px)]">
      {/* Header */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b bg-muted/50 sticky top-0 z-10">
        <div className="border-r" />
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={cn(
              "px-2 py-2 text-center border-r",
              isToday(day) && "bg-primary/5"
            )}
          >
            <div className="text-xs text-muted-foreground">{format(day, "EEE")}</div>
            <div className={cn(
              "text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full mx-auto",
              isToday(day) && "bg-primary text-primary-foreground"
            )}>
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>

      {/* Time grid */}
      {HOURS.map((hour) => (
        <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b min-h-[52px]">
          <div className="text-[10px] text-muted-foreground px-2 py-1 border-r text-right">
            {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
          </div>
          {days.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const hourTasks = getTasksForHour(day, hour);
            return (
              <div
                key={`${dateStr}-${hour}`}
                className="border-r p-0.5 relative"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(dateStr, hour)}
              >
                {hourTasks.map((task) => {
                  const blocks = Math.max(1, Math.ceil(task.time_estimate / 60));
                  return (
                    <div
                      key={task.id}
                      style={{ minHeight: `${blocks * 48}px` }}
                    >
                      <TaskBlock
                        task={task}
                        onDragStart={() => onDragStart(task.id)}
                        onClick={() => onTaskClick(task)}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
