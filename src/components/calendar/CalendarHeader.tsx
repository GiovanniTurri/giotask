import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Mail, CalendarDays } from "lucide-react";
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

interface CalendarHeaderProps {
  currentDate: Date;
  view: "month" | "week" | "day";
  onDateChange: (date: Date) => void;
  onToday: () => void;
  tasks?: (Task & { client_tags?: { name: string; color: string } | null })[];
  onTaskClick?: (task: any) => void;
}

export function CalendarHeader({
  currentDate,
  view,
  onDateChange,
  onToday,
  tasks = [],
  onTaskClick,
}: CalendarHeaderProps) {
  const [agendaOpen, setAgendaOpen] = useState(false);

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
    return tasks
      .filter((t) => t.scheduled_date && isSameDay(parseISO(t.scheduled_date), now))
      .sort((a, b) => {
        const at = a.scheduled_start_time ?? "99:99:99";
        const bt = b.scheduled_start_time ?? "99:99:99";
        return at.localeCompare(bt);
      });
  }, [tasks]);

  const timedTasks = todayTasks.filter((t) => t.scheduled_start_time);
  const anytimeTasks = todayTasks.filter((t) => !t.scheduled_start_time);

  const handleRowClick = (task: any) => {
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
            {todayTasks.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">
                {todayTasks.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 p-0">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Today</div>
              <div className="text-xs text-muted-foreground">
                {format(new Date(), "EEEE, MMM d")}
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              {todayTasks.length} {todayTasks.length === 1 ? "task" : "tasks"}
            </Badge>
          </div>

          {todayTasks.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Nothing scheduled for today.
            </div>
          ) : (
            <ScrollArea className="max-h-80">
              <div className="py-1">
                {timedTasks.map((task) => (
                  <AgendaRow key={task.id} task={task} onClick={() => handleRowClick(task)} />
                ))}
                {anytimeTasks.length > 0 && (
                  <>
                    {timedTasks.length > 0 && (
                      <div className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                        Anytime
                      </div>
                    )}
                    {anytimeTasks.map((task) => (
                      <AgendaRow key={task.id} task={task} onClick={() => handleRowClick(task)} />
                    ))}
                  </>
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

interface AgendaRowProps {
  task: Task & { client_tags?: { name: string; color: string } | null };
  onClick: () => void;
}

function AgendaRow({ task, onClick }: AgendaRowProps) {
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
        {task.scheduled_start_time ? task.scheduled_start_time.slice(0, 5) : "—"}
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
