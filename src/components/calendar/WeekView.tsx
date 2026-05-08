import { useState } from "react";
import { startOfWeek, addDays, format, isSameDay, isToday } from "date-fns";
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

interface WeekViewProps {
  currentDate: Date;
  tasks: (Task & { client_tags?: { name: string; color: string } | null })[];
  googleEvents?: GoogleEvent[];
  onDragStart: (taskId: string) => void;
  onDrop: (date: string, hour?: number) => void;
  onTaskClick: (task: any) => void;
  onLongPressSlot?: (date: string, hour?: number, minute?: number) => void;
}

function DayColumn({
  day, dateStr, dayTasks, dayGEvents, onDragStart, onDrop, onTaskClick, onLongPressSlot,
}: {
  day: Date;
  dateStr: string;
  dayTasks: any[];
  dayGEvents: any[];
  onDragStart: (id: string) => void;
  onDrop: (date: string, hour?: number) => void;
  onTaskClick: (t: any) => void;
  onLongPressSlot?: (date: string, hour?: number, minute?: number) => void;
}) {
  const totalHeight = HOURS.length * ROW_HEIGHT;
  const [pressInd, setPressInd] = useState<{ top: number; height: number } | null>(null);

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
    <div
      key={dateStr}
      className="border-r relative select-none"
      style={{ height: totalHeight, touchAction: "pan-y" }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const hour = Math.floor(y / ROW_HEIGHT) + FIRST_HOUR;
        onDrop(dateStr, hour);
      }}
      onPointerDown={(e) => {
        const target = e.target as HTMLElement | null;
        if (!target?.closest("[data-task-block], [data-google-event]")) {
          const rect = e.currentTarget.getBoundingClientRect();
          const { top } = computeTime(e.clientY, rect);
          setPressInd({ top, height: ROW_HEIGHT });
        }
        longPress.onPointerDown(e);
      }}
      onPointerMove={longPress.onPointerMove}
      onPointerUp={(e) => { setPressInd(null); longPress.onPointerUp(e); }}
      onPointerCancel={(e) => { setPressInd(null); longPress.onPointerCancel(e); }}
      onPointerLeave={(e) => { setPressInd(null); longPress.onPointerLeave(e); }}
      onClickCapture={longPress.onClickCapture}
      onContextMenu={longPress.onContextMenu}
    >
      {/* Hour grid lines */}
      {HOURS.map((hour) => (
        <div
          key={hour}
          className="border-b absolute w-full pointer-events-none"
          style={{ top: (hour - FIRST_HOUR) * ROW_HEIGHT, height: ROW_HEIGHT }}
        />
      ))}

      {pressInd && (
        <div
          className="absolute left-0 right-0 bg-primary/15 border border-primary/40 rounded-sm animate-pulse pointer-events-none z-[1]"
          style={{ top: pressInd.top, height: pressInd.height }}
        />
      )}

      {/* Google events */}
      {dayGEvents.map((event: any) => {
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
            className="absolute left-0 right-0 px-0.5 z-[2]"
            style={{ top, height }}
          >
            <GoogleEventBlock event={event} />
          </div>
        );
      })}

      {/* Tasks */}
      {dayTasks.map((task: any, idx: number) => {
        const { hour, minute } = parseStartTime(task);
        const top = (hour + minute / 60 - FIRST_HOUR) * ROW_HEIGHT;
        const height = Math.max((task.time_estimate / 60) * ROW_HEIGHT, 20);
        const overlapping = dayTasks.filter((other: any, oi: number) => {
          if (oi >= idx) return false;
          const os = parseStartTime(other);
          const otherStart = os.hour * 60 + os.minute;
          const otherEnd = otherStart + other.time_estimate;
          const thisStart = hour * 60 + minute;
          const thisEnd = thisStart + task.time_estimate;
          return thisStart < otherEnd && thisEnd > otherStart;
        });
        const leftOffset = overlapping.length * 20;

        return (
          <div
            key={task.id}
            data-task-block
            className="absolute z-[3]"
            style={{
              top,
              height,
              left: `${leftOffset + 2}px`,
              right: "2px",
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
  );
}

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6);
const FIRST_HOUR = 6;
const ROW_HEIGHT = 60; // px per hour

function parseStartTime(t: Task): { hour: number; minute: number } {
  if (!t.scheduled_start_time) return { hour: 9, minute: 0 };
  const parts = t.scheduled_start_time.split(":");
  return { hour: parseInt(parts[0], 10), minute: parseInt(parts[1] || "0", 10) };
}

export function WeekView({ currentDate, tasks, googleEvents = [], onDragStart, onDrop, onTaskClick }: WeekViewProps) {
  const weekStart = startOfWeek(currentDate);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getTasksForDay = (day: Date) =>
    tasks.filter((t) => t.scheduled_date && isSameDay(new Date(t.scheduled_date), day));

  const getGoogleEventsForDay = (day: Date) =>
    googleEvents.filter((e) => isSameDay(new Date(e.start_time), day));

  const totalHeight = HOURS.length * ROW_HEIGHT;

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
      <div className="grid grid-cols-[60px_repeat(7,1fr)]">
        {/* Hour labels column */}
        <div className="border-r" style={{ height: totalHeight }}>
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="text-[10px] text-muted-foreground px-2 py-1 text-right border-b"
              style={{ height: ROW_HEIGHT }}
            >
              {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const dayTasks = getTasksForDay(day);
          const dayGEvents = getGoogleEventsForDay(day);

          return (
            <div
              key={dateStr}
              className="border-r relative"
              style={{ height: totalHeight }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const y = e.clientY - rect.top;
                const hour = Math.floor(y / ROW_HEIGHT) + FIRST_HOUR;
                onDrop(dateStr, hour);
              }}
            >
              {/* Hour grid lines */}
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="border-b absolute w-full"
                  style={{ top: (hour - FIRST_HOUR) * ROW_HEIGHT, height: ROW_HEIGHT }}
                />
              ))}

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
                    className="absolute left-0 right-0 px-0.5 z-[2]"
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
                // Simple overlap offset
                const overlapping = dayTasks.filter((other, oi) => {
                  if (oi >= idx) return false;
                  const os = parseStartTime(other);
                  const otherStart = os.hour * 60 + os.minute;
                  const otherEnd = otherStart + other.time_estimate;
                  const thisStart = hour * 60 + minute;
                  const thisEnd = thisStart + task.time_estimate;
                  return thisStart < otherEnd && thisEnd > otherStart;
                });
                const leftOffset = overlapping.length * 20;

                return (
                  <div
                    key={task.id}
                    className="absolute z-[3]"
                    style={{
                      top,
                      height,
                      left: `${leftOffset + 2}px`,
                      right: "2px",
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
          );
        })}
      </div>
    </div>
  );
}
