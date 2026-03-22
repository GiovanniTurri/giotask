import { format, isSameDay } from "date-fns";
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

interface GoogleEventBlockProps {
  event: GoogleEvent;
  compact?: boolean;
}

export function GoogleEventBlock({ event, compact = false }: GoogleEventBlockProps) {
  const startTime = new Date(event.start_time);
  const endTime = new Date(event.end_time);
  const durationMin = (endTime.getTime() - startTime.getTime()) / 60000;

  return (
    <div
      className={cn(
        "rounded px-2 py-1 text-xs font-medium border-l-2 opacity-80 cursor-default",
        compact ? "truncate" : ""
      )}
      style={{
        backgroundColor: `${event.color || "#4285f4"}15`,
        borderLeftColor: event.color || "#4285f4",
        color: event.color || "#4285f4",
      }}
      title={`${event.title}${event.location ? ` • ${event.location}` : ""} (${format(startTime, "h:mm a")} - ${format(endTime, "h:mm a")})`}
    >
      {compact ? (
        <span className="truncate block">{event.title}</span>
      ) : (
        <div>
          <div className="truncate font-semibold">{event.title}</div>
          <div className="text-[10px] opacity-70">
            {event.all_day
              ? "All day"
              : `${format(startTime, "h:mm a")} – ${format(endTime, "h:mm a")}`}
          </div>
        </div>
      )}
    </div>
  );
}
