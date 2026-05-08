import { useState } from "react";
import { format, isSameDay, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { TaskBlock } from "./TaskBlock";
import { GoogleEventBlock } from "./GoogleEventBlock";
import { useLongPress } from "@/hooks/useLongPress";
import type { Task } from "@/hooks/useTasks";

interface GoogleEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  color: string | null;
  location: string | null;
}

interface DayViewProps {
  currentDate: Date;
  tasks: (Task & { client_tags?: { name: string; color: string } | null })[];
  googleEvents?: GoogleEvent[];
  onDragStart: (taskId: string) => void;
  onDrop: (date: string, hour?: number) => void;
  onTaskClick: (task: any) => void;
  onLongPressSlot?: (date: string, hour?: number, minute?: number) => void;
}

const HOURS = Array.from({ length: 18 }, (_, i) => i + 5);
const FIRST_HOUR = 5;
const ROW_HEIGHT = 60;

function parseStartTime(t: Task): { hour: number; minute: number } {
  if (!t.scheduled_start_time) return { hour: 9, minute: 0 };
  const parts = t.scheduled_start_time.split(":");
  return { hour: parseInt(parts[0], 10), minute: parseInt(parts[1] || "0", 10) };
}

export function DayView({ currentDate, tasks, googleEvents = [], onDragStart, onDrop, onTaskClick, onLongPressSlot }: DayViewProps) {
  const [pressInd, setPressInd] = useState<{ top: number; height: number } | null>(null);

  const dayTasks = tasks.filter(
    (t) => t.scheduled_date && isSameDay(new Date(t.scheduled_date), currentDate)
  );
  const dayGEvents = googleEvents.filter((e) =>
    isSameDay(new Date(e.start_time), currentDate)
  );

  const dateStr = format(currentDate, "yyyy-MM-dd");
  const totalHeight = HOURS.length * ROW_HEIGHT;

  const computeTime = (clientY: number, rect: DOMRect) => {
    const y = Math.max(0, Math.min(clientY - rect.top, totalHeight - 1));
    const totalMinutes = (y / ROW_HEIGHT) * 60 + FIRST_HOUR * 60;
    const snapped = Math.round(totalMinutes / 15) * 15;
    return { hour: Math.floor(snapped / 60), minute: snapped % 60, top: ((snapped - FIRST_HOUR * 60) / 60) * ROW_HEIGHT };
  };

  const longPress = useLongPress((e) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest("[data-task-block], [data-google-event]")) return;
    const container = e.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    const { hour, minute } = computeTime(e.clientY, rect);
    setPressInd(null);
    onLongPressSlot?.(dateStr, hour, minute);
  });

  return (
    <div className="border rounded-lg overflow-auto max-h-[calc(100vh-220px)]">
      {/* Header */}
      <div className={cn(
        "px-4 py-3 border-b font-semibold text-sm sticky top-0 z-10 bg-card",
        isToday(currentDate) && "bg-primary/5"
      )}>
        {format(currentDate, "EEEE, MMMM d, yyyy")}
        {isToday(currentDate) && (
          <span className="ml-2 text-xs font-normal text-primary">Today</span>
        )}
      </div>

      {/* Time grid */}
      <div className="grid grid-cols-[80px_1fr]">
        {/* Hour labels */}
        <div className="border-r" style={{ height: totalHeight }}>
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="text-xs text-muted-foreground px-3 py-2 text-right border-b"
              style={{ height: ROW_HEIGHT }}
            >
              {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
            </div>
          ))}
        </div>

        {/* Day column */}
        <div
          className="relative select-none"
          style={{ height: totalHeight, touchAction: "pan-y" }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const y = e.clientY - rect.top;
            const hour = Math.floor(y / ROW_HEIGHT) + FIRST_HOUR;
            onDrop(dateStr, hour);
          }}
          {...longPress}
          onPointerDown={(e) => {
            const target = e.target as HTMLElement | null;
            if (!target?.closest("[data-task-block], [data-google-event]")) {
              const rect = e.currentTarget.getBoundingClientRect();
              const { top } = computeTime(e.clientY, rect);
              setPressInd({ top, height: ROW_HEIGHT });
            }
            longPress.onPointerDown(e);
          }}
          onPointerUp={(e) => { setPressInd(null); longPress.onPointerUp(e); }}
          onPointerCancel={(e) => { setPressInd(null); longPress.onPointerCancel(e); }}
          onPointerLeave={(e) => { setPressInd(null); longPress.onPointerLeave(e); }}
          onPointerMove={(e) => longPress.onPointerMove(e)}
        >
          {/* Hour grid lines */}
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="border-b absolute w-full pointer-events-none"
              style={{ top: (hour - FIRST_HOUR) * ROW_HEIGHT, height: ROW_HEIGHT }}
            />
          ))}

          {/* Long-press indicator */}
          {pressInd && (
            <div
              className="absolute left-0 right-0 bg-primary/15 border border-primary/40 rounded-sm animate-pulse pointer-events-none z-[1]"
              style={{ top: pressInd.top, height: pressInd.height }}
            />
          )}

          {/* Google events */}
          {dayGEvents.map((event) => {
            const start = new Date(event.start_time);
            const end = new Date(event.end_time);
            const startH = start.getHours() + start.getMinutes() / 60;
            const endH = end.getHours() + end.getMinutes() / 60;
            const top = (startH - FIRST_HOUR) * ROW_HEIGHT;
            const height = Math.max((endH - startH) * ROW_HEIGHT, 20);
            return (
              <div
                key={event.id}
                data-google-event
                className="absolute left-0 right-0 px-1 z-[2]"
                style={{ top, height }}
              >
                <GoogleEventBlock event={event} />
              </div>
            );
          })}

          {/* Tasks */}
          {dayTasks.map((task, idx) => {
            const { hour, minute } = parseStartTime(task);
            const top = (hour + minute / 60 - FIRST_HOUR) * ROW_HEIGHT;
            const height = Math.max((task.time_estimate / 60) * ROW_HEIGHT, 20);
            const overlapping = dayTasks.filter((other, oi) => {
              if (oi >= idx) return false;
              const os = parseStartTime(other);
              const otherStart = os.hour * 60 + os.minute;
              const otherEnd = otherStart + other.time_estimate;
              const thisStart = hour * 60 + minute;
              const thisEnd = thisStart + task.time_estimate;
              return thisStart < otherEnd && thisEnd > otherStart;
            });
            const leftOffset = overlapping.length * 40;

            return (
              <div
                key={task.id}
                data-task-block
                className="absolute z-[3]"
                style={{
                  top,
                  height,
                  left: `${leftOffset + 4}px`,
                  right: "4px",
                }}
              >
                <TaskBlock
                  task={task}
                  showTime
                  onDragStart={() => onDragStart(task.id)}
                  onClick={() => onTaskClick(task)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
