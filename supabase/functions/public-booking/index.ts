import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const TZ = "Europe/Rome";
const OPEN_MIN = 7 * 60; // 07:00
const CLOSE_MIN = 20 * 60; // 20:00
const STEP = 30;
const DAYS_AHEAD = 14;
const MIN_NOTICE_MS = 60 * 60 * 1000;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function romeParts(d: Date) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false,
    }).formatToParts(d).map((x) => [x.type, x.value]),
  );
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour % 24, mi: +p.minute };
}

/** Convert Rome wall-clock (date "YYYY-MM-DD", minutes from midnight) to UTC ms. */
function romeToUtc(date: string, minutes: number): number {
  const [y, m, d] = date.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d, Math.floor(minutes / 60), minutes % 60);
  const p = romeParts(new Date(guess));
  const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi);
  return guess - (asUtc - guess);
}

function romeDateStr(d: Date) {
  const p = romeParts(d);
  return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

function addDays(date: string, n: number) {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

async function busyIntervals(fromDate: string, toDate: string) {
  const busy: Array<[number, number]> = [];
  const { data: tasks } = await supabase
    .from("tasks")
    .select("scheduled_date, scheduled_start_time, time_estimate, status")
    .gte("scheduled_date", fromDate).lte("scheduled_date", toDate)
    .not("scheduled_start_time", "is", null).neq("status", "done");
  for (const t of tasks || []) {
    const [h, mi] = String(t.scheduled_start_time).split(":").map(Number);
    const s = romeToUtc(t.scheduled_date!, h * 60 + mi);
    busy.push([s, s + (t.time_estimate || 30) * 60000]);
  }
  const fromIso = new Date(romeToUtc(fromDate, 0)).toISOString();
  const toIso = new Date(romeToUtc(addDays(toDate, 1), 0)).toISOString();
  const { data: events } = await supabase
    .from("google_calendar_events")
    .select("start_time, end_time, all_day")
    .lt("start_time", toIso).gt("end_time", fromIso).eq("all_day", false);
  for (const e of events || []) busy.push([Date.parse(e.start_time), Date.parse(e.end_time)]);
  const { data: bookings } = await supabase
    .from("bookings").select("start_time, end_time")
    .lt("start_time", toIso).gt("end_time", fromIso);
  for (const b of bookings || []) busy.push([Date.parse(b.start_time), Date.parse(b.end_time)]);
  return busy;
}

const overlaps = (s: number, e: number, busy: Array<[number, number]>) =>
  busy.some(([bs, be]) => s < be && e > bs);

async function computeSlots(duration: number) {
  const today = romeDateStr(new Date());
  const last = addDays(today, DAYS_AHEAD - 1);
  const busy = await busyIntervals(today, last);
  const earliest = Date.now() + MIN_NOTICE_MS;
  const days: Array<{ date: string; slots: string[] }> = [];
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const date = addDays(today, i);
    const slots: string[] = [];
    for (let m = OPEN_MIN; m + duration <= CLOSE_MIN; m += STEP) {
      const s = romeToUtc(date, m);
      const e = s + duration * 60000;
      if (s < earliest || overlaps(s, e, busy)) continue;
      slots.push(new Date(s).toISOString());
    }
    days.push({ date, slots });
  }
  return days;
}

const BookSchema = z.object({
  action: z.literal("book"),
  duration: z.union([z.literal(30), z.literal(60)]),
  start: z.string().datetime(),
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  note: z.string().trim().max(1000).optional().default(""),
});
const SlotsSchema = z.object({
  action: z.literal("slots"),
  duration: z.union([z.literal(30), z.literal(60)]),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.action === "slots") {
      const p = SlotsSchema.safeParse(body);
      if (!p.success) return json({ error: "Invalid request" }, 400);
      return json({ timezone: TZ, days: await computeSlots(p.data.duration) });
    }
    const p = BookSchema.safeParse(body);
    if (!p.success) return json({ error: "Please check your details", details: p.error.flatten().fieldErrors }, 400);
    const { duration, start, name, email, note } = p.data;

    const s = Date.parse(start);
    const days = await computeSlots(duration);
    const valid = days.some((d) => d.slots.some((x) => Date.parse(x) === s));
    if (!valid) return json({ error: "That slot is no longer available. Please pick another." }, 409);

    const e = s + duration * 60000;
    const rp = romeParts(new Date(s));
    const date = romeDateStr(new Date(s));
    const time = `${String(rp.h).padStart(2, "0")}:${String(rp.mi).padStart(2, "0")}:00`;

    const { data: task, error: tErr } = await supabase.from("tasks").insert({
      title: `Meeting with ${name}`,
      description: `Booked via /book\nEmail: ${email}${note ? `\n\n${note}` : ""}`,
      scheduled_date: date,
      scheduled_start_time: time,
      time_estimate: duration,
      task_kind: "task",
    }).select("id").single();
    if (tErr) throw tErr;

    const { error: bErr } = await supabase.from("bookings").insert({
      visitor_name: name, visitor_email: email, note,
      start_time: new Date(s).toISOString(), end_time: new Date(e).toISOString(),
      duration_minutes: duration, task_id: task.id,
    });
    if (bErr) throw bErr;

    // Notify owner via the existing push reminder dispatcher.
    await supabase.from("reminder_queue").insert({
      task_id: task.id,
      fire_at: new Date().toISOString(),
      title: "New booking",
      body: `${name} booked ${duration} min on ${date} at ${time.slice(0, 5)}`,
      tag: `booking-${task.id}`,
    });

    return json({ ok: true, date, time: time.slice(0, 5) });
  } catch (err) {
    console.error("public-booking error", err);
    return json({ error: err instanceof Error ? err.message : "Unexpected error" }, 500);
  }
});
