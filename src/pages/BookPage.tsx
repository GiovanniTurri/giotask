import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Day = { date: string; slots: string[] };
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });
const fmtDay = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

export default function BookPage() {
  const [duration, setDuration] = useState<30 | 60>(30);
  const [days, setDays] = useState<Day[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const load = async (d: 30 | 60) => {
    setLoading(true);
    setSlot(null);
    const { data, error } = await supabase.functions.invoke("public-booking", { body: { action: "slots", duration: d } });
    setLoading(false);
    if (error || data?.error) return setError("Could not load availability.");
    setDays(data.days);
    setDate((cur) => (cur && data.days.find((x: Day) => x.date === cur)?.slots.length ? cur : data.days.find((x: Day) => x.slots.length)?.date ?? null));
  };
  useEffect(() => { load(duration); }, [duration]);

  const current = useMemo(() => days.find((d) => d.date === date), [days, date]);

  const book = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slot) return;
    setSending(true);
    setError(null);
    const { data, error } = await supabase.functions.invoke("public-booking", {
      body: { action: "book", duration, start: slot, name, email, note },
    });
    setSending(false);
    if (error || data?.error) {
      let msg = data?.error;
      try { msg = msg || JSON.parse(await (error as any).context.text()).error; } catch { /* ignore */ }
      setError(msg || "Booking failed.");
      load(duration);
      return;
    }
    setDone(`${fmtDay(data.date)} at ${data.time}`);
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-3 max-w-sm">
          <CheckCircle2 className="h-12 w-12 mx-auto text-primary" />
          <h1 className="text-2xl font-heading font-bold">You're booked</h1>
          <p className="text-muted-foreground">{duration} minutes on {done} (Rome time).</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 flex justify-center">
      <div className="w-full max-w-3xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-3xl font-heading font-bold">Book a meeting with Giovanni</h1>
          <p className="text-muted-foreground">Pick a length and a free slot. Times are shown in Rome time.</p>
        </header>

        <div className="flex gap-2">
          {([30, 60] as const).map((d) => (
            <Button key={d} variant={duration === d ? "default" : "outline"} onClick={() => setDuration(d)}>
              {d} min
            </Button>
          ))}
        </div>

        {loading ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : (
          <div className="grid md:grid-cols-[220px_1fr] gap-6">
            <div className="flex md:flex-col gap-2 overflow-x-auto">
              {days.map((d) => (
                <button key={d.date} disabled={!d.slots.length}
                  onClick={() => { setDate(d.date); setSlot(null); }}
                  className={cn("rounded-md border px-3 py-2 text-left text-sm whitespace-nowrap disabled:opacity-40",
                    date === d.date ? "border-primary bg-primary/10" : "hover:bg-muted")}>
                  <div className="font-medium">{fmtDay(d.date)}</div>
                  <div className="text-xs text-muted-foreground">{d.slots.length} free</div>
                </button>
              ))}
            </div>
            <div className="space-y-4">
              {current?.slots.length ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {current.slots.map((s) => (
                    <Button key={s} variant={slot === s ? "default" : "outline"} size="sm" onClick={() => setSlot(s)}>
                      {fmtTime(s)}
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No free slots in the next two weeks.</p>
              )}
              {slot && (
                <form onSubmit={book} className="space-y-3 rounded-lg border bg-card p-4">
                  <p className="font-medium">{fmtDay(date!)} · {fmtTime(slot)} · {duration} min</p>
                  <div className="space-y-1"><Label htmlFor="n">Your name</Label>
                    <Input id="n" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} /></div>
                  <div className="space-y-1"><Label htmlFor="e">Your email</Label>
                    <Input id="e" type="email" required maxLength={255} value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                  <div className="space-y-1"><Label htmlFor="no">What's it about? (optional)</Label>
                    <Textarea id="no" maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} /></div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button type="submit" disabled={sending}>
                    {sending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Confirm booking
                  </Button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
