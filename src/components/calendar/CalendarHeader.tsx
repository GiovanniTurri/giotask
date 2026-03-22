import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from "date-fns";

interface CalendarHeaderProps {
  currentDate: Date;
  view: "month" | "week" | "day";
  onDateChange: (date: Date) => void;
  onToday: () => void;
}

export function CalendarHeader({ currentDate, view, onDateChange, onToday }: CalendarHeaderProps) {
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

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={onToday}>
        Today
      </Button>
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
