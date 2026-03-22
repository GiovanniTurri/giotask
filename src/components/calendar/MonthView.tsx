import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isSameDay, isToday,
} from "date-fns";
import { cn } from "@/lib/utils";
import { TaskBlock } from "./TaskBlock";
import type { Task } from "@/hooks/useTasks";

interface MonthViewProps {
  currentDate: Date;
  tasks: (Task & { client_tags?: { name: string; color: string } | null })[];
  onDragStart: (taskId: string) => void;
  onDrop: (date: string) => void;
  onTaskClick: (task: any) => void;
  onDayClick: (date: Date) => void;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function MonthView({ currentDate, tasks, onDragStart, onDrop, onTaskClick, onDayClick }: MonthViewProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getTasksForDay = (day: Date) =>
    tasks.filter((t) => t.scheduled_date && isSameDay(new Date(t.scheduled_date), day));

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="grid grid-cols-7 border-b bg-muted/50">
        {WEEKDAYS.map((d) => (
          <div key={d} className="px-2 py-2 text-xs font-medium text-muted-foreground text-center">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 auto-rows-[minmax(100px,1fr)]">
        {days.map((day) => {
          const dayTasks = getTasksForDay(day);
          const dateStr = format(day, "yyyy-MM-dd");
          return (
            <div
              key={dateStr}
              className={cn(
                "border-b border-r p-1 transition-colors",
                !isSameMonth(day, currentDate) && "bg-muted/30",
                isToday(day) && "bg-primary/5"
              )}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(dateStr)}
              onClick={() => onDayClick(day)}
            >
              <div className={cn(
                "text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full",
                isToday(day) && "bg-primary text-primary-foreground"
              )}>
                {format(day, "d")}
              </div>
              <div className="space-y-0.5 overflow-hidden">
                {dayTasks.slice(0, 3).map((task) => (
                  <TaskBlock
                    key={task.id}
                    task={task}
                    compact
                    onDragStart={() => onDragStart(task.id)}
                    onClick={() => onTaskClick(task)}
                  />
                ))}
                {dayTasks.length > 3 && (
                  <div className="text-[10px] text-muted-foreground px-1">
                    +{dayTasks.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
