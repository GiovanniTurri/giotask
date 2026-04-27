import { addDays, differenceInCalendarDays, format, isAfter, isBefore, startOfDay } from "date-fns";

export interface CoupleLifeSuggestion {
  id: string;
  title: string;
  description: string;
  reason: string;
  suggestedDate?: string;
  durationMinutes: number;
  holidayName?: string;
}

interface SuggestionTask {
  title: string;
  description: string | null;
  scheduled_date: string | null;
  status: string;
}

export interface HolidayRow {
  id: string;
  name: string;
  month: number;
  day: number;
  year: number | null;
  recurring: boolean;
  kind: string;
  title: string;
  description: string;
}

function toISODate(date: Date) {
  return format(date, "yyyy-MM-dd");
}

interface HolidayAnchor {
  name: string;
  date: Date;
  title: string;
  description: string;
}

export function buildHolidayAnchors(holidays: HolidayRow[], today = new Date()): HolidayAnchor[] {
  const start = startOfDay(today);
  const horizon = addDays(start, 90);
  const anchors: HolidayAnchor[] = [];

  for (const h of holidays) {
    const fallbackTitle = h.title?.trim() || `Plan something for ${h.name}`;
    const fallbackDesc = h.description?.trim() || `Reserve time around ${h.name} for the two of you.`;

    if (h.recurring) {
      // Try this year, then next year — pick the next future occurrence within the horizon
      for (const year of [start.getFullYear(), start.getFullYear() + 1]) {
        const candidate = new Date(year, h.month - 1, h.day);
        if (!isBefore(candidate, start) && !isAfter(candidate, horizon)) {
          anchors.push({ name: h.name, date: candidate, title: fallbackTitle, description: fallbackDesc });
          break;
        }
      }
    } else if (h.year != null) {
      const candidate = new Date(h.year, h.month - 1, h.day);
      if (!isBefore(candidate, start) && !isAfter(candidate, horizon)) {
        anchors.push({ name: h.name, date: candidate, title: fallbackTitle, description: fallbackDesc });
      }
    }
  }

  return anchors.sort((a, b) => a.date.getTime() - b.date.getTime());
}

function containsAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

export function getRelativeDayLabel(dateISO: string) {
  const diff = differenceInCalendarDays(new Date(`${dateISO}T00:00:00`), startOfDay(new Date()));
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff > 1) return `in ${diff} days`;
  if (diff === -1) return "yesterday";
  return `${Math.abs(diff)} days ago`;
}

export function buildCoupleLifeSuggestions(
  tasks: SuggestionTask[],
  holidays: HolidayRow[] = []
): CoupleLifeSuggestion[] {
  const doneText = tasks
    .filter((task) => task.status === "done")
    .map((task) => `${task.title} ${task.description || ""}`.toLowerCase())
    .join(" ");

  const suggestions: CoupleLifeSuggestion[] = buildHolidayAnchors(holidays).slice(0, 3).map((anchor) => ({
    id: `holiday-${anchor.name}-${toISODate(anchor.date)}`,
    title: anchor.title,
    description: anchor.description,
    reason: `${anchor.name} is ${getRelativeDayLabel(toISODate(anchor.date))}.`,
    suggestedDate: toISODate(anchor.date),
    durationMinutes: 120,
    holidayName: anchor.name,
  }));

  const inferred = [
    {
      id: "repeat-dinner",
      match: ["dinner", "restaurant", "aperitivo", "cena"],
      title: "Repeat a dinner you both enjoyed",
      description: "Pick a place with the same mood as a past date and add one small surprise.",
      reason: "Past completed activities suggest dinner plans work well for you.",
    },
    {
      id: "repeat-walk",
      match: ["walk", "park", "passeggiata", "hike"],
      title: "Plan a slow walk together",
      description: "Choose a scenic route, add a coffee stop, and keep the schedule unhurried.",
      reason: "You have completed outdoor or walking activities before.",
    },
    {
      id: "repeat-movie",
      match: ["movie", "cinema", "film", "netflix"],
      title: "Create a movie-night ritual",
      description: "Choose a film, snacks, and a start time so it feels planned rather than improvised.",
      reason: "Past memories point toward cozy screen-time activities.",
    },
    {
      id: "anniversary",
      match: ["anniversary", "anniversario"],
      title: "Prepare a mini anniversary recap",
      description: "Collect a few photos, revisit a meaningful place, or write a short note about the last months together.",
      reason: "Anniversary-related memories deserve a recurring reminder.",
    },
    {
      id: "birthday",
      match: ["birthday", "compleanno"],
      title: "Start a birthday surprise plan",
      description: "List gift ideas, reserve time, and decide one personal detail early.",
      reason: "Birthday-related memories can be planned ahead with less stress.",
    },
  ];

  inferred.forEach((item) => {
    if (containsAny(doneText, item.match)) {
      suggestions.push({ ...item, durationMinutes: 90 });
    }
  });

  suggestions.push(
    {
      id: "evergreen-check-in",
      title: "Schedule a relationship check-in walk",
      description: "Take 60 minutes to walk, talk about the week, and decide one thing to look forward to.",
      reason: "A simple recurring plan keeps couple time intentional.",
      durationMinutes: 60,
    },
    {
      id: "evergreen-new-place",
      title: "Try one new place together",
      description: "Choose a café, restaurant, neighborhood, or small exhibition neither of you has tried before.",
      reason: "Novelty makes the upcoming calendar feel more memorable.",
      durationMinutes: 120,
    }
  );

  return Array.from(new Map(suggestions.map((suggestion) => [suggestion.id, suggestion])).values()).slice(0, 6);
}
