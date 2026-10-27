export interface RecontactInput {
  next_contact_date: string | null;
  last_contacted_at: string | null;
  recontact_every_days: number | null;
  created_at?: string | null;
}

/** Due date (YYYY-MM-DD): manual date wins, else last contact (or creation) + every N days. */
export function computeDueDate(p: RecontactInput): string | null {
  if (p.next_contact_date) return p.next_contact_date;
  if (!p.recontact_every_days || p.recontact_every_days <= 0) return null;
  const base = p.last_contacted_at || p.created_at;
  if (!base) return null;
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + p.recontact_every_days);
  return d.toISOString().slice(0, 10);
}

export function todayISO(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Days until due (negative = overdue). */
export function daysUntil(due: string, today: string): number {
  return Math.round((Date.parse(due + "T00:00:00Z") - Date.parse(today + "T00:00:00Z")) / 86400000);
}

/** UTC instant for 09:00 Europe/Rome on the given date (DST-aware). */
export function romeNineAm(date: string): Date {
  const guess = new Date(`${date}T09:00:00Z`);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Rome", hour: "2-digit", hourCycle: "h23",
  }).formatToParts(guess);
  const romeHour = Number(parts.find((x) => x.type === "hour")?.value ?? 9);
  return new Date(guess.getTime() - (romeHour - 9) * 3600000);
}
