import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

interface ScheduleEntry {
  task_id: string;
  scheduled_date: string;
  scheduled_start_time: string;
  fragment_minutes: number;
}

interface SchedulePreviewProps {
  schedule: ScheduleEntry[];
  tasks: any[];
  onApply: () => void;
  onDismiss: () => void;
  isApplying: boolean;
}

export function SchedulePreview({ schedule, tasks, onApply, onDismiss, isApplying }: SchedulePreviewProps) {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  // Group by date
  const byDate = new Map<string, ScheduleEntry[]>();
  for (const entry of schedule) {
    const existing = byDate.get(entry.scheduled_date) || [];
    existing.push(entry);
    byDate.set(entry.scheduled_date, existing);
  }
  const sortedDates = [...byDate.keys()].sort();

  return (
    <Card className="p-4 space-y-4 border-primary/30 bg-primary/5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">AI Schedule Preview</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onDismiss} disabled={isApplying}>
            <X className="h-3.5 w-3.5 mr-1" /> Dismiss
          </Button>
          <Button size="sm" onClick={onApply} disabled={isApplying}>
            <Check className="h-3.5 w-3.5 mr-1" /> Apply
          </Button>
        </div>
      </div>

      <div className="space-y-3 max-h-64 overflow-auto">
        {sortedDates.map((date) => (
          <div key={date}>
            <div className="text-xs font-medium text-muted-foreground mb-1">
              {new Date(date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
            </div>
            <div className="space-y-1">
              {byDate.get(date)!.sort((a, b) => a.scheduled_start_time.localeCompare(b.scheduled_start_time)).map((entry, i) => {
                const task = taskMap.get(entry.task_id);
                const tagColor = task?.client_tags?.color || "hsl(var(--primary))";
                return (
                  <div
                    key={`${entry.task_id}-${i}`}
                    className="flex items-center gap-2 text-xs rounded px-2 py-1"
                    style={{ backgroundColor: tagColor + "15", borderLeft: `3px solid ${tagColor}` }}
                  >
                    <span className="text-muted-foreground w-14 shrink-0">
                      {entry.scheduled_start_time.slice(0, 5)}
                    </span>
                    <span className="font-medium truncate">{task?.title || entry.task_id}</span>
                    <span className="text-muted-foreground ml-auto shrink-0">{entry.fragment_minutes}m</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
