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

function toISODate(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function easterDate(year: number) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

function upcomingHolidayAnchors(today = new Date()) {
  const start = startOfDay(today);
  const horizon = addDays(start, 90);
  const years = [start.getFullYear(), start.getFullYear() + 1];
  const anchors = years.flatMap((year) => [
    { name: "Valentine’s Day", date: new Date(year, 1, 14), title: "Plan a Valentine’s date night", description: "Book a relaxed dinner, a shared dessert stop, or a small surprise walk together." },
    { name: "International Women’s Day", date: new Date(year, 2, 8), title: "Prepare a thoughtful Women’s Day moment", description: "Plan flowers, a handwritten note, or a calm evening around something she likes." },
    { name: "April 23", date: new Date(year, 3, 23), title: "Create an April 23 memory", description: "Use this date as a small relationship checkpoint: dinner, photos, or a meaningful walk." },
    { name: "April 25", date: new Date(year, 3, 25), title: "Plan an April 25 day together", description: "Schedule a day trip, brunch, or outdoor activity if you both have time free." },
    { name: "Easter / spring", date: easterDate(year), title: "Choose a spring weekend activity", description: "Plan a picnic, garden walk, museum visit, or a quiet brunch during the Easter period." },
    { name: "Summer", date: new Date(year, 5, 21), title: "Schedule a summer picnic", description: "Pick a park, beach, or sunset spot and keep the plan light and easy." },
    { name: "Halloween", date: new Date(year, 9, 31), title: "Plan a cozy Halloween evening", description: "Choose a movie night, themed cooking, or a relaxed evening at home." },
    { name: "Christmas", date: new Date(year, 11, 25), title: "Plan a Christmas moment", description: "Prepare a festive walk, gift exchange, dinner, or visit to seasonal lights." },
    { name: "New Year", date: new Date(year, 11, 31), title: "Plan New Year’s Eve together", description: "Reserve time for dinner, reflections, and a small shared goal for the next year." },
  ]);

  return anchors
    .filter((anchor) => !isBefore(anchor.date, start) && !isAfter(anchor.date, horizon))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
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

export function buildCoupleLifeSuggestions(tasks: SuggestionTask[]): CoupleLifeSuggestion[] {
  const doneText = tasks
    .filter((task) => task.status === "done")
    .map((task) => `${task.title} ${task.description || ""}`.toLowerCase())
    .join(" ");

  const suggestions: CoupleLifeSuggestion[] = upcomingHolidayAnchors().slice(0, 3).map((anchor) => ({
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