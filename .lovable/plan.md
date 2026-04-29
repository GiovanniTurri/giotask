# Landing Page at `/magic` for Freelancers

## Goal
Create a standalone marketing landing page that positions TaskFlow (giotask) as a productivity OS for freelancers, with a clear CTA to start using the app for free.

## Platform recap (what we're selling)
From the codebase, TaskFlow currently offers:
- **Smart Task Management** — statuses (todo / in-progress / done), client tags with custom colors, time estimates, scheduled dates, age indicators for stale tasks.
- **AI Scheduler** — auto-plans open tasks across the 09:00–18:00 working window, with a preview before applying.
- **Unified Calendar** — month/week/day views, drag-and-drop rescheduling, "move overdue to yesterday" shortcut.
- **Google Calendar Sync** — read-only OAuth integration so existing meetings appear alongside tasks.
- **Background Push Reminders** — server-side Web Push so reminders fire even when the app is closed.
- **Client Tags** — segment work per client with color-coded tags (perfect for freelancers juggling multiple clients).

## Page structure (`/magic`)

The page is a **standalone marketing route** — no sidebar, full-width, dark-by-default hero, designed for conversion.

```text
┌─────────────────────────────────────────┐
│ Top nav: Logo · Features · FAQ · [CTA]  │
├─────────────────────────────────────────┤
│ HERO                                    │
│   Eyebrow: "For freelancers & solos"    │
│   H1: "Stop juggling clients.           │
│        Start shipping work."            │
│   Sub: AI plans your week so you bill   │
│        more hours, not manage them.     │
│   [Start free →]  [See how it works]    │
│   Mock screenshot of calendar + AI      │
├─────────────────────────────────────────┤
│ SOCIAL PROOF STRIP                      │
│   "Built for independent professionals" │
│   logo-row of generic client types      │
├─────────────────────────────────────────┤
│ 3 KEY FEATURES (cards)                  │
│   1. AI Schedule — "Plan a week in 5s"  │
│   2. Per-Client Tags — "Know exactly    │
│      where every billable hour went"    │
│   3. Calendar that Syncs — "Google      │
│      meetings + tasks, one view"        │
├─────────────────────────────────────────┤
│ FREELANCER OUTCOMES (numbers)           │
│   • +X focused hours/week               │
│   • Zero double-bookings                │
│   • Reminders that survive standby      │
├─────────────────────────────────────────┤
│ HOW IT WORKS — 3 steps                  │
│   1. Drop in tasks  2. AI plans them    │
│   3. Get pushed when it's time          │
├─────────────────────────────────────────┤
│ OBJECTIONS / FAQ                        │
│   Ease of use? · Existing tools?        │
│   Pricing? · Data privacy? · iOS push?  │
├─────────────────────────────────────────┤
│ FINAL CTA banner                        │
│   "Your next billable hour starts here" │
│   [Start free →]                        │
├─────────────────────────────────────────┤
│ Footer: Privacy · Terms · © giotask     │
└─────────────────────────────────────────┘
```

## Copy (final, freelancer tone — confident, results-oriented)

**Hero**
- Eyebrow: `For freelancers, consultants & solo operators`
- H1: `Stop juggling clients. Start shipping work.`
- Sub: `TaskFlow is the AI-powered planner that turns your scattered to-dos into a billable week — automatically.`
- Primary CTA: `Start free` → `/` (the app)
- Secondary CTA: `See how it works` → scrolls to "How it works"

**Three key features (the asked-for 2–3)**
1. **AI Schedule** — "Drop your tasks. Get a planned week in seconds. The AI respects your 9–6, your time estimates, and your existing meetings."  → translates to: *more deep-work blocks, less Sunday-night planning*.
2. **Per-Client Tags** — "Color-code work by client. Filter, count, and review where every hour went."  → translates to: *clean invoices, defensible timesheets*.
3. **Calendar that actually syncs** — "Two-way visual calendar with Google sync and drag-to-reschedule. One source of truth."  → translates to: *no double bookings, no missed standups*.

**Outcomes strip**
- `Reclaim 5+ focus hours a week`
- `Never miss a client deadline (push reminders survive standby)`
- `One view: tasks + Google Calendar + reminders`

**Objections / FAQ** (accordion)
- *"I already use Notion / Trello / Google Calendar."* — TaskFlow doesn't replace your docs. It plugs into Google Calendar (read-only) and adds the one thing those tools don't: an AI that actually plans your day around real meetings.
- *"Is it complicated to set up?"* — No login required to try, no credit card. Add a task, hit *Schedule*. That's it.
- *"What does it cost?"* — Free while in beta. No paywall on AI scheduling, calendar, or reminders.
- *"Will reminders work when my phone is locked?"* — Yes. Background Web Push is delivered server-side via cron — works on Android, and on iOS 16.4+ when added to Home Screen.
- *"What about my data?"* — Stored in your private backend. Google Calendar access is read-only. See [Privacy Policy](/privacy).

**Final CTA**
- Headline: `Your next billable hour starts here.`
- Button: `Open TaskFlow free →` → `/`

## Technical implementation

**New files**
- `src/pages/MagicLandingPage.tsx` — single-file landing component using existing shadcn primitives (`Button`, `Card`, `Accordion`, `Badge`).
- (optional) `src/components/landing/FeatureCard.tsx` if the file grows beyond ~250 lines; otherwise keep inline.

**Routing**
- `src/App.tsx`: add `<Route path="/magic" element={<MagicLandingPage />} />`.
- The landing page should render **without the AppSidebar** (it's a public marketing page). Approach: wrap the page in a layout that renders full-width and hides the sidebar — easiest is to refactor `App.tsx` so `/magic` is rendered outside the `flex min-h-screen` shell:

```text
<Routes>
  <Route path="/magic" element={<MagicLandingPage />} />
  <Route path="/*" element={<AppShell />} />  // existing sidebar + routes
</Routes>
```

**Styling**
- Reuse existing design tokens (`--primary`, `--accent`, `--couple-accent`, Space Grotesk for headings, Inter for body).
- Force dark hero section regardless of user theme using `dark` class on the hero wrapper for a consistent marketing look.
- Mobile-first (current viewport is 411px). Single-column on mobile, 3-col grid on `lg:`.
- Use `lucide-react` icons already in project: `Sparkles`, `CalendarDays`, `Tags`, `BellRing`, `Zap`, `CheckSquare`.

**Visuals**
- Hero "screenshot": a stylized CSS mock of a day-view calendar with 3 task blocks and an AI badge — built with divs (no external images needed).
- No external image dependencies.

**SEO**
- Set `<title>` and `<meta description>` via a small `useEffect` in the page component (no need to add react-helmet).

## Out of scope
- No actual signup/billing flow (the app is currently single-user and free).
- No A/B testing, analytics events, or email capture.
- No changes to existing pages, routes, or backend.

## Acceptance
- Visiting `/magic` shows the landing page **without** the app sidebar.
- All CTAs link to `/` (the working app).
- FAQ accordion expands/collapses.
- Layout looks correct at 411px (mobile), 768px (tablet), and ≥1024px (desktop).
- Existing routes (`/`, `/calendar`, `/couple-life`, `/settings`, `/privacy`, `/terms`) still render with the sidebar exactly as before.
