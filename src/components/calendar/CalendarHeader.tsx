import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, Mail, CalendarDays, MapPin } from "lucide-react";
import {
  format,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  isSameDay,
  parseISO,
} from "date-fns";
import type { Task } from "@/hooks/useTasks";
import { cn } from "@/lib/utils";

interface GoogleEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  color: string | null;
  location: string | null;
}

interface CalendarHeaderProps {
  currentDate: Date;
  view: "month" | "week" | "day";
  onDateChange: (date: Date) => void;
  onToday: () => void;
  tasks?: (Task & { client_tags?: { name: string; color: string } | null })[];
  googleEvents?: GoogleEvent[];
  onTaskClick?: (task: any) => void;
}

type AgendaItem =
  | {
      kind: "task";
      id: string;
      sortKey: string;
      timeLabel: string;
      task: Task & { client_tags?: { name: string; color: string } | null };
    }
  | {
      kind: "event";
      id: string;
      sortKey: string;
      timeLabel: string;
      event: GoogleEvent;
    };

export function CalendarHeader({
  currentDate,
  view,
  onDateChange,
  onToday,
  tasks = [],
  googleEvents = [],
  onTaskClick,
}: CalendarHeaderProps) {
  const [agendaOpen, setAgendaOpen] = useState(false);
  const [includeGEvents, setIncludeGEvents] = useState(true);

  const navigate = (direction: 1 | -1) => {
    const fns = {
      month: direction === 1 ? addMonths : subMonths,
      week: direction === 1 ? addWeeks : subWeeks,
      day: direction === 1 ? addDays : subDays,
    };
    onDateChange(fns[view](currentDate, 1));
  };

  const label = {
    month: format(currentDate, "MMMM yyyy"),
    week: `Week of ${format(currentDate, "MMM d, yyyy")}`,
    day: format(currentDate, "EEEE, MMMM d, yyyy"),
  }[view];

  const todayTasks = useMemo(() => {
    const now = new Date();
    return tasks.filter(
      (t) => t.scheduled_date && isSameDay(parseISO(t.scheduled_date), now)
    );
  }, [tasks]);

  const todayEvents = useMemo(() => {
    const now = new Date();
    return googleEvents.filter((e) => isSameDay(new Date(e.start_time), now));
  }, [googleEvents]);

  const items: AgendaItem[] = useMemo(() => {
    const taskItems: AgendaItem[] = todayTasks.map((task) => ({
      kind: "task" as const,
      id: `task-${task.id}`,
      sortKey: task.scheduled_start_time ?? "99:99:99",
      timeLabel: task.scheduled_start_time ? task.scheduled_start_time.slice(0, 5) : "—",
      task,
    }));

    const eventItems: AgendaItem[] = includeGEvents
      ? todayEvents.map((event) => {
          const start = new Date(event.start_time);
          const hh = String(start.getHours()).padStart(2, "0");
          const mm = String(start.getMinutes()).padStart(2, "0");
          return {
            kind: "event" as const,
            id: `event-${event.id}`,
            sortKey: event.all_day ? "00:00:00" : `${hh}:${mm}:00`,
            timeLabel: event.all_day ? "All day" : `${hh}:${mm}`,
            event,
          };
        })
      : [];

    return [...taskItems, ...eventItems].sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [todayTasks, todayEvents, includeGEvents]);

  const triggerCount = todayTasks.length + (includeGEvents ? todayEvents.length : 0);

  const handleTaskRowClick = (task: any) => {
    setAgendaOpen(false);
    onTaskClick?.(task);
  };

  const handleGoToToday = () => {
    setAgendaOpen(false);
    onToday();
  };

  return (
    <div className="flex items-center gap-2">
      <Popover open={agendaOpen} onOpenChange={setAgendaOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <CalendarDays className="h-4 w-4 mr-1" />
            Today
            {triggerCount > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">
                {triggerCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 p-0">
          <div className="px-4 py-3 border-b">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Today</div>
                <div className="text-xs text-muted-foreground">
                  {format(new Date(), "EEEE, MMM d")}
                </div>
              </div>
              <Badge variant="outline" className="text-xs">
                {todayTasks.length} {todayTasks.length === 1 ? "task" : "tasks"}
                {includeGEvents && todayEvents.length > 0 && (
                  <span className="ml-1 text-muted-foreground">
                    · {todayEvents.length} evt
                  </span>
                )}
              </Badge>
            </div>
            <div className="flex items-center justify-between mt-3">
              <Label
                htmlFor="agenda-include-gcal"
                className="text-xs text-muted-foreground cursor-pointer"
              >
                Include Google Calendar
              </Label>
              <Switch
                id="agenda-include-gcal"
                checked={includeGEvents}
                onCheckedChange={setIncludeGEvents}
              />
            </div>
          </div>

          {items.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Nothing scheduled for today.
            </div>
          ) : (
            <ScrollArea className="max-h-80">
              <div className="py-1">
                {items.map((item) =>
                  item.kind === "task" ? (
                    <TaskRow
                      key={item.id}
                      task={item.task}
                      timeLabel={item.timeLabel}
                      onClick={() => handleTaskRowClick(item.task)}
                    />
                  ) : (
                    <EventRow key={item.id} event={item.event} timeLabel={item.timeLabel} />
                  )
                )}
              </div>
            </ScrollArea>
          )}

          <div className="border-t p-2">
            <Button variant="ghost" size="sm" className="w-full justify-center" onClick={handleGoToToday}>
              Go to today
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(1)}>
        <ChevronRight className="h-4 w-4" />
      </Button>
      <h2 className="text-lg font-semibold ml-2">{label}</h2>
    </div>
  );
}

interface TaskRowProps {
  task: Task & { client_tags?: { name: string; color: string } | null };
  timeLabel: string;
  onClick: () => void;
}

function TaskRow({ task, timeLabel, onClick }: TaskRowProps) {
  const isFollowUp = (task as any).task_kind === "follow_up";
  const dotColor = task.client_tags?.color ?? "hsl(var(--primary))";
  const isDone = task.status === "done";

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-accent/60 transition-colors"
    >
      <span
        className={cn(
          "text-xs tabular-nums w-12 shrink-0",
          isDone ? "text-muted-foreground/60" : "text-muted-foreground"
        )}
      >
        {timeLabel}
      </span>
      <span
        className="h-2 w-2 rounded-full shrink-0"
        style={{ backgroundColor: dotColor }}
        aria-hidden
      />
      <span
        className={cn(
          "flex-1 min-w-0 text-sm flex items-center gap-1 truncate",
          isDone && "line-through text-muted-foreground"
        )}
      >
        {isFollowUp && <Mail className="h-3 w-3 shrink-0 opacity-70" />}
        <span className="truncate">{task.title}</span>
      </span>
      <span className="text-xs text-muted-foreground shrink-0">{task.time_estimate}m</span>
    </button>
  );
}

interface EventRowProps {
  event: GoogleEvent;
  timeLabel: string;
}

function EventRow({ event, timeLabel }: EventRowProps) {
  const dotColor = event.color ?? "#4285f4";
  return (
    <div className="w-full flex items-center gap-2 px-4 py-2">
      <span className="text-xs tabular-nums w-12 shrink-0 text-muted-foreground">
        {timeLabel}
      </span>
      <span
        className="h-2 w-2 rounded-full shrink-0 ring-1 ring-background"
        style={{ backgroundColor: dotColor }}
        aria-hidden
      />
      <span className="flex-1 min-w-0 text-sm flex items-center gap-1 truncate">
        <span className="truncate">{event.title}</span>
        {event.location && (
          <MapPin className="h-3 w-3 shrink-0 opacity-60" aria-hidden />
        )}
      </span>
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground shrink-0">
        gcal
      </span>
    </div>
  );
}
