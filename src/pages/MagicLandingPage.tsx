import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  CalendarDays,
  Tags,
  BellRing,
  Zap,
  CheckSquare,
  ArrowRight,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FEATURES = [
  {
    icon: Sparkles,
    title: "AI Schedule",
    pitch: "Drop your tasks. Get a planned week in seconds.",
    body:
      "The AI respects your 9–6, your time estimates, and your existing meetings — so you stop spending Sunday night drawing a calendar.",
    outcome: "More deep-work blocks, less planning.",
  },
  {
    icon: Tags,
    title: "Per-client tags",
    pitch: "Color-code work by client. Bill with confidence.",
    body:
      "Filter, count, and review where every billable hour went. Defensible timesheets without a spreadsheet.",
    outcome: "Clean invoices. Fewer disputes.",
  },
  {
    icon: CalendarDays,
    title: "A calendar that syncs",
    pitch: "Google meetings + tasks in one view.",
    body:
      "Two-way visual calendar with read-only Google sync and drag-to-reschedule. One source of truth for your week.",
    outcome: "Zero double bookings.",
  },
];

const FAQ = [
  {
    q: "I already use Notion / Trello / Google Calendar. Why add this?",
    a: "TaskFlow doesn't replace your docs or your inbox. It plugs into Google Calendar (read-only) and adds the one thing those tools don't: an AI planner that schedules your day around real meetings, real estimates, and real priorities.",
  },
  {
    q: "Is it complicated to set up?",
    a: "No. Open the app, add a task, hit Schedule. No signup wall, no credit card, no onboarding wizard.",
  },
  {
    q: "What does it cost?",
    a: "Free while in beta — including AI scheduling, Google Calendar sync, and background reminders. No paywall on core features.",
  },
  {
    q: "Will reminders fire when my phone is locked?",
    a: "Yes. Reminders are delivered server-side via Web Push, so they survive standby. Works on Android out of the box, and on iOS 16.4+ when the app is added to the Home Screen.",
  },
  {
    q: "What about my data and privacy?",
    a: "Your tasks live in your private backend. Google Calendar access is read-only — we never write to your calendar. See the Privacy Policy for details.",
  },
];

export default function MagicLandingPage() {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = "TaskFlow — The AI planner for freelancers";

    const meta =
      document.querySelector('meta[name="description"]') ||
      (() => {
        const m = document.createElement("meta");
        m.setAttribute("name", "description");
        document.head.appendChild(m);
        return m;
      })();
    const prevDesc = meta.getAttribute("content");
    meta.setAttribute(
      "content",
      "TaskFlow turns scattered to-dos into a billable week. AI scheduling, per-client tags, and a calendar that syncs with Google. Built for freelancers."
    );

    return () => {
      document.title = prevTitle;
      if (prevDesc !== null) meta.setAttribute("content", prevDesc);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/magic" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </span>
            <span
              className="text-lg font-bold tracking-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              TaskFlow
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
            <a href="#features" className="hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#how" className="hover:text-foreground transition-colors">
              How it works
            </a>
            <a href="#faq" className="hover:text-foreground transition-colors">
              FAQ
            </a>
          </nav>
          <Button asChild size="sm">
            <Link to="/">
              Start free <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      {/* Hero — forced dark for marketing punch */}
      <section className="dark relative overflow-hidden bg-background text-foreground">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(60% 50% at 50% 0%, hsl(var(--primary) / 0.25), transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 lg:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-5 gap-1.5 bg-secondary/60 text-foreground">
              <Sparkles className="h-3 w-3 text-accent" />
              For freelancers, consultants & solo operators
            </Badge>
            <h1
              className="text-balance text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Stop juggling clients.
              <br />
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Start shipping work.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
              TaskFlow is the AI-powered planner that turns your scattered to-dos into a
              billable week — automatically. Plan less. Bill more. Sleep better.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link to="/">
                  Start free <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                <a href="#how">See how it works</a>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              No signup. No credit card. Free while in beta.
            </p>
          </div>

          {/* Hero mock — pure CSS day view */}
          <div className="mx-auto mt-14 max-w-4xl">
            <div className="relative rounded-2xl border border-border/60 bg-card/60 p-3 shadow-2xl backdrop-blur sm:p-5">
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  Today · Tuesday
                </div>
                <Badge className="gap-1 bg-primary/15 text-primary hover:bg-primary/15">
                  <Sparkles className="h-3 w-3" /> AI planned
                </Badge>
              </div>
              <div className="grid grid-cols-[40px_1fr] gap-2 pt-3 text-xs sm:text-sm">
                {[
                  { time: "09", h: 56, label: "Deep work · Acme landing", tag: "hsl(var(--primary))", sub: "2h · in progress" },
                  { time: "11", h: 36, label: "Client call · Globex", tag: "hsl(var(--accent))", sub: "30m · Google Cal" },
                  { time: "14", h: 64, label: "Invoice + admin", tag: "hsl(var(--couple))", sub: "1h · todo" },
                  { time: "16", h: 44, label: "Review PR · Initech", tag: "hsl(var(--primary))", sub: "45m · todo" },
                ].map((row, i) => (
                  <div key={i} className="contents">
                    <div className="pt-1 text-right font-mono text-muted-foreground">
                      {row.time}
                    </div>
                    <div
                      className="rounded-md border border-border/60 bg-background/60 px-3 py-2"
                      style={{ borderLeft: `3px solid ${row.tag}`, minHeight: row.h }}
                    >
                      <div className="font-medium">{row.label}</div>
                      <div className="text-xs text-muted-foreground">{row.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Outcomes strip */}
      <section className="border-y border-border/60 bg-secondary/30">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 py-10 sm:grid-cols-3 sm:px-6">
          {[
            { icon: Clock, n: "5+ hrs", label: "of focus reclaimed each week" },
            { icon: CheckSquare, n: "0", label: "double bookings, ever" },
            { icon: BellRing, n: "100%", label: "reminders that survive standby" },
          ].map(({ icon: Icon, n, label }) => (
            <div key={label} className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <div
                  className="text-2xl font-bold leading-none"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {n}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{label}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            className="text-3xl font-bold tracking-tight sm:text-4xl"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            The three things that move the needle
          </h2>
          <p className="mt-4 text-muted-foreground">
            No bloat. No 40-feature dashboard. Just the workflow that gets a freelance week
            shipped.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, pitch, body, outcome }) => (
            <Card
              key={title}
              className="group relative overflow-hidden border-border/60 transition-colors hover:border-primary/40"
            >
              <CardContent className="p-6">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-105">
                  <Icon className="h-5 w-5" />
                </div>
                <h3
                  className="text-xl font-semibold"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {title}
                </h3>
                <p className="mt-1 text-sm font-medium text-foreground/90">{pitch}</p>
                <p className="mt-3 text-sm text-muted-foreground">{body}</p>
                <div className="mt-5 flex items-center gap-2 border-t border-border/60 pt-4 text-xs font-medium text-accent">
                  <Zap className="h-3.5 w-3.5" />
                  {outcome}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-t border-border/60 bg-secondary/20">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2
              className="text-3xl font-bold tracking-tight sm:text-4xl"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              From inbox chaos to a billable week — in 60 seconds
            </h2>
          </div>

          <ol className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              {
                n: "01",
                t: "Drop in your tasks",
                d: "Title, time estimate, client tag. That's it.",
              },
              {
                n: "02",
                t: "Let AI plan them",
                d: "It places work into 9–6, around your Google meetings, and shows a preview before applying.",
              },
              {
                n: "03",
                t: "Get pushed when it's time",
                d: "Background reminders fire on Android & iOS — even with the app closed.",
              },
            ].map((step) => (
              <li
                key={step.n}
                className="rounded-xl border border-border/60 bg-card p-6"
              >
                <div
                  className="text-sm font-mono font-bold text-primary"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {step.n}
                </div>
                <div
                  className="mt-2 text-lg font-semibold"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {step.t}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{step.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FAQ / Objections */}
      <section id="faq" className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <div className="text-center">
          <Badge variant="secondary" className="mb-4 gap-1.5">
            <ShieldCheck className="h-3 w-3" /> Honest answers
          </Badge>
          <h2
            className="text-3xl font-bold tracking-tight sm:text-4xl"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            What freelancers ask before signing up
          </h2>
        </div>

        <Accordion type="single" collapsible className="mt-10">
          {FAQ.map((item, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="border-border/60">
              <AccordionTrigger className="text-left text-base font-medium hover:no-underline">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border/60">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
          <h2
            className="text-balance text-3xl font-bold tracking-tight sm:text-5xl"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Your next billable hour starts here.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Open TaskFlow, drop in a task, and let the AI plan the rest. No credit card. No
            commitment.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link to="/">
                Open TaskFlow free <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg" className="w-full sm:w-auto">
              <a href="#features">Read the features again</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 bg-secondary/20">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary">
              <Sparkles className="h-3 w-3 text-primary-foreground" />
            </span>
            <span>© {new Date().getFullYear()} giotask</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
            <Link to="/" className="hover:text-foreground transition-colors">
              Open app
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
