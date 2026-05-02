# Coder.md — Project Architecture & Conventions

A guide for AI assistants (Claude Code, Cursor, etc.) and new contributors to work effectively on this codebase. Read this first.

---

## 1. What this app is

**Single-user personal task management & scheduling app** with AI-assisted planning and Google Calendar integration. There is **no authentication and no multi-tenant data model** — the entire database is treated as one user's workspace. Do not introduce per-user filtering, profiles, `auth.users`, or `user_id` columns unless the user explicitly asks to add multi-user support.

Hosted at `giotask.lovable.app`. Owner: Giovanni Turri.

---

## 2. Tech stack

| Layer       | Tech                                                                      |
| ----------- | ------------------------------------------------------------------------- |
| Build       | Vite 5 + TypeScript 5 + SWC                                               |
| UI          | React 18, React Router v6, Tailwind v3, shadcn/ui (Radix), lucide-react   |
| State/data  | TanStack Query v5 (`@tanstack/react-query`)                               |
| Forms       | react-hook-form + zod                                                     |
| Dates       | date-fns v3                                                               |
| Backend     | Supabase (Postgres + Edge Functions on Deno) via **Lovable Cloud**        |
| Scheduling  | `pg_cron` + `pg_net` for periodic jobs                                    |
| Notifications | Web Push (VAPID) + Service Worker (`public/sw.js`)                      |
| AI          | Lovable AI Gateway (default), Cloud OpenAI-compatible, or Local LLM       |
| Tests       | Vitest + Testing Library + Playwright                                     |

The Supabase client is **auto-generated** at `src/integrations/supabase/client.ts` and the types at `src/integrations/supabase/types.ts`. **Never edit these files manually.**

Environment vars (auto-managed, never edit `.env`):
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`

---

## 3. Routing & shell

`src/App.tsx` defines two top-level branches under `<BrowserRouter>`:

- `/magic` → marketing landing page (`MagicLandingPage`), renders **outside** the app shell
- `/*` → `AppShell` (sidebar + main content) wrapping all real app routes

App routes inside the shell:
```
/             → Index            (tasks dashboard)
/calendar     → CalendarPage     (month/week/day)
/couple-life  → CoupleLifePage   (AI date ideas)
/settings     → SettingsPage     (LLM config, Google Calendar, push, holidays, tags)
/privacy      → PrivacyPolicyPage
/terms        → TermsOfServicePage
*             → NotFound
```

`<RemindersMount />` is mounted once at the root to schedule local reminders via `useReminders`. `<AppSidebar />` provides global navigation.

---

## 4. Folder layout

```
src/
  components/
    ui/                      shadcn/ui primitives (do not modify)
    calendar/                CalendarHeader, MonthView, WeekView, DayView,
                             TaskBlock, GoogleEventBlock, SchedulePreview
    AppSidebar.tsx           NavLink.tsx
    TaskCard.tsx             TaskDialog.tsx
    GoogleCalendarSettings.tsx  TagManager.tsx  HolidayManager.tsx
  hooks/
    useTasks.ts              CRUD + cache invalidation + mirror triggers
    useGoogleCalendar.ts     Connections, events, calendars, mirror settings
    useAiScheduler.ts        Schedule fetch, preview, apply (with mirror batch)
    useLlmConfig.ts          Provider settings (lovable | cloud | local)
    useClientTags.ts  useHolidays.ts  useUserSettings.ts
    usePushSubscription.ts  useReminders.ts
    useCoupleLifeAiSuggestions.ts
  integrations/supabase/     AUTO-GENERATED — never edit
  lib/
    schedulerPrompt.ts       Shared system prompt (edge fn + local LLM)
    coupleLifeAiPrompt.ts  coupleLifeSuggestions.ts
    taskAge.ts  utils.ts (cn)
  pages/                     One file per route
  test/                      Vitest setup
supabase/
  config.toml                project_id only — do not add per-function blocks
                             unless a function needs non-default settings
  functions/
    schedule-tasks/          AI scheduling via Lovable AI / Cloud
    google-calendar-auth/    OAuth + connection mgmt + mirror settings
    google-calendar-sync/    Read events into Supabase (every 6h)
    google-calendar-mirror/  Write tasks back as private "Focus" blocks
    generate-couple-ideas/   AI date suggestions
    push-subscribe/  push-unsubscribe/  get-vapid-public-key/
    send-due-reminders/      Periodic reminder dispatch
public/
  sw.js                      Service worker (Web Push)
  manifest.webmanifest
mem://                       Project memory (rules — see § 12)
```

---

## 5. Database schema (high level)

All tables live in `public`. RLS is enabled on every table with a single permissive policy `USING (true) WITH CHECK (true)` — this is intentional for the single-user model. **Linter warnings about "RLS Policy Always True" are expected and accepted.** Do not introduce auth-based policies unless the user asks for multi-user support.

| Table                          | Purpose                                                                 |
| ------------------------------ | ----------------------------------------------------------------------- |
| `tasks`                        | Title, description, status (`todo`/`in_progress`/`done`), `priority`, `time_estimate`, `scheduled_date`, `scheduled_start_time`, `client_tag_id`, `reminder_minutes`, `task_kind`, `parent_task_id`, `follow_up_message` |
| `client_tags`                  | User-defined color tags                                                 |
| `holidays`                     | Holidays + anniversaries (validated by trigger `validate_holiday`)      |
| `user_settings`                | `notifications_enabled`, `default_reminder_minutes`                     |
| `llm_config`                   | `active_provider` (`lovable`/`cloud`/`local`), endpoints, models, keys  |
| `google_calendar_connections`  | OAuth tokens, `selected_calendars`, `granted_scopes`, mirror settings   |
| `google_calendar_events`       | Cached read-only events from Google                                     |
| `task_calendar_mirrors`        | Maps task → Google event id created by the mirror function             |
| `push_subscriptions`           | Web Push endpoints                                                      |
| `reminder_queue`               | Dispatched-once reminder rows                                           |
| `app_config`                   | Public key/value (e.g. VAPID public key)                                |

Shared trigger: `update_updated_at_column()` on every `*_updated_at` column.

### Schema-change rules

- For **schema changes** use the migration tool (creates SQL files).
- For **data inserts/updates/deletes** use the insert/SQL tool — not migrations.
- Never modify reserved schemas (`auth`, `storage`, `realtime`, `supabase_functions`, `vault`).
- Validation that depends on `now()` must be enforced in **triggers**, not `CHECK` constraints (Postgres requires CHECK to be immutable).
- After any schema change, the auto-generated `types.ts` is updated. Never edit it.

---

## 6. Edge functions

Conventions every edge function follows:

```ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  // ... handler
  // Always include corsHeaders in EVERY response, including errors.
});
```

Rules:
- One file per function: `supabase/functions/<name>/index.ts` — no subfolders.
- Do not import from `src/` — edge functions run on Deno, not the bundler.
- Use `SUPABASE_SERVICE_ROLE_KEY` for full-access writes inside functions.
- Validate all request bodies (zod or manual). Never run raw user-supplied SQL.
- Call functions from the client via `supabase.functions.invoke("name", { body })`. Never construct `/api/...` paths.
- `verify_jwt` defaults to false (no auth in this app). Don't override unless requested.

### Function map

| Function                  | Trigger                          | Purpose                                              |
| ------------------------- | -------------------------------- | ---------------------------------------------------- |
| `schedule-tasks`          | `useAiScheduler.fetchSchedule`   | LLM-based scheduling for `lovable`/`cloud` providers |
| `google-calendar-auth`    | Settings UI                      | OAuth URL, callback, list/select calendars, disconnect, **update_mirror_settings** |
| `google-calendar-sync`    | pg_cron every 6h + on demand     | Read events from Google → `google_calendar_events`   |
| `google-calendar-mirror`  | `useTasks` mutations + scheduler | Write tasks back to Google as private "Focus" events |
| `generate-couple-ideas`   | Couple Life page                 | AI date suggestions                                  |
| `send-due-reminders`      | pg_cron                          | Drain `reminder_queue` and send Web Push             |
| `push-subscribe`/`-unsubscribe`/`get-vapid-public-key` | Service worker | Web Push lifecycle |

### Local LLM exception

The `local` provider is **not** routed through an edge function. The browser calls the user's local endpoint (Ollama, LM Studio, etc.) directly to avoid CORS / private-network issues. See `useAiScheduler.fetchLocalSchedule`. The system prompt is shared with the edge function via `src/lib/schedulerPrompt.ts`.

---

## 7. AI scheduling flow (key feature)

1. User clicks **Schedule → Reschedule All (AI)** in `CalendarPage`.
2. `useAiScheduler.fetchSchedule()`:
   - If `active_provider === "local"` → direct fetch to local endpoint with two-attempt fallback (multi-message → single-message).
   - Otherwise → `supabase.functions.invoke("schedule-tasks")`.
3. The model returns a JSON array `[{ task_id, scheduled_date, scheduled_start_time, fragment_minutes }]`. Robust parsing strips ```` ``` ```` fences and tolerates trailing commas.
4. Result is shown in `<SchedulePreview />`. Nothing is written until the user clicks **Apply**.
5. On apply: deduplicate by `task_id`, run `updateTask` per row, then **batch-call** `google-calendar-mirror` with all task_ids.

Constraints baked into prompts:
- Daily window **09:00–18:00**
- Tasks > 120 min **fragmented** into 30–90 min blocks across days
- Skip done tasks, respect `priority`

---

## 8. Google Calendar — two-way integration

Read sync (existing): `calendar.readonly` events into `google_calendar_events`, refreshed every 6h.

**Mirroring (write-back)** — see `mem://features/google-calendar-integration`:
- Per-connection toggle: `mirror_enabled`, `mirror_target_calendar_id`, `mirror_label` (default "Focus"), `mirror_visibility` (default `private`).
- `granted_scopes` column lets the UI prompt legacy connections to reconnect with `calendar.events`.
- `task_calendar_mirrors` table (unique on `task_id + connection_id`) tracks the Google event id for upsert/delete.
- Mirror events carry `extendedProperties.private.managed_by = "lovable_task_mirror"`.
- Mirror events are **filtered out** in `useGoogleCalendarEvents` to avoid duplicate rendering inside the app.
- Triggers: every task create/update/restore → fire-and-forget upsert; delete → delete; `applySchedule` → batch upsert; toggling mirror or changing target/label → backfill.

v1 limits: only tasks with `scheduled_start_time` are mirrored; one target calendar per account; failures are logged, never block UI.

---

## 9. State & data conventions

- **All server reads/writes go through TanStack Query hooks** in `src/hooks/`. Components don't call `supabase` directly.
- Query keys are stable strings: `["tasks", filters]`, `["google-calendar-events", start, end]`, `["google-calendar-connections"]`, `["llm-config"]`, `["client-tags"]`, `["holidays"]`, `["user-settings"]`.
- Mutation `onSuccess` invalidates the relevant key. Cross-feature side effects (e.g. mirror trigger) are fire-and-forget with `void`.
- **Toasts**: use `sonner`'s `toast.success / .error / .info`. The shadcn `useToast` hook is also installed but `sonner` is the primary.

---

## 10. UI / design system

- **Dark mode by default.** Headings use **Space Grotesk**, body uses **Inter**.
- All colors are defined as **HSL CSS variables** in `src/index.css` and exposed in `tailwind.config.ts`. Use semantic tokens (`bg-background`, `text-foreground`, `text-primary`, `border-destructive`, etc.) — **never** hard-code colors like `text-white`, `bg-black`, `text-[#fff]` in components.
- shadcn primitives live in `src/components/ui/` and must not be modified directly. Extend them via variants (cva) in feature components.
- Icons: `lucide-react`. Class merging: `cn(...)` from `src/lib/utils.ts`.
- Mobile-first; the sidebar collapses to icons under `lg`.

---

## 11. Calendar layout math (don't break this)

Week & Day views position task blocks **absolutely** inside day columns:
- Scale: **60px = 1 hour**.
- `top` = (start hour − display start hour) × 60px + minute offset.
- `height` = `time_estimate / 60 * 60px`.
- Overlapping tasks are offset horizontally; Google events render in a separate translucent style via `GoogleEventBlock`.
- Drag-and-drop sets `scheduled_date` and snaps `scheduled_start_time` to the hour.

If you change the scale or column structure, update **all three** views (Month/Week/Day) and `SchedulePreview`.

---

## 12. Project memory (`mem://`)

The repo carries persistent rules under `mem://`. They override generic best practices. Read the index first when planning anything non-trivial:

```
mem://index.md                                     ← always start here
mem://features/scheduling                          ← AI scheduling rules
mem://features/llm-configuration                   ← provider routing
mem://features/calendar                            ← layout math
mem://features/task-management                     ← data model
mem://features/google-calendar-integration         ← read + mirror
mem://architecture/stack                           ← tech overview
mem://legal/policies                               ← privacy/ToS
```

Save new rules when the user states preferences, rejects an approach, or pins a constraint. Don't save trivia, file paths, or things obvious from the code.

---

## 13. Hard rules (do / don't)

**Do**
- Use `import { supabase } from "@/integrations/supabase/client"`.
- Put new server logic in an edge function, not in the React app.
- Use migrations for schema, the SQL/insert tool for data.
- Match existing patterns (TanStack Query hook → component) for any new feature.
- Honor the 09:00–18:00 scheduling window and 30–90 min fragmentation.
- Include CORS headers on every edge-function response, including errors.

**Don't**
- Don't add authentication, `user_id` columns, or auth-based RLS unless explicitly asked.
- Don't edit `src/integrations/supabase/{client,types}.ts` or `.env`.
- Don't add per-function blocks to `supabase/config.toml` unless a function genuinely needs non-default settings.
- Don't run raw user SQL (`rpc("execute_sql")`) or accept SQL strings from the client.
- Don't hard-code colors, fonts, or spacing — use tokens.
- Don't mention Supabase by name to end-users; refer to it as "Lovable Cloud" / "the backend".
- Don't run `npm run build`/`tsc` manually — the harness does it.
- Don't bypass the AI scheduler's preview step (user approval is required).

---

## 14. Adding a feature — checklist

1. Read `mem://index.md` and any relevant memory file.
2. If it needs DB changes → migration tool (then wait for the regenerated `types.ts`).
3. If it needs a new server endpoint → new edge function under `supabase/functions/<name>/index.ts`, then `deploy_edge_functions`.
4. Create or extend a TanStack Query hook in `src/hooks/`.
5. Build UI in `src/components/` or a new page in `src/pages/`, using shadcn primitives + semantic tokens.
6. Wire the route in `src/App.tsx` if it's a new page.
7. Update memory if the change introduces a new persistent rule.

---

## 15. Common pitfalls observed in this codebase

- Mirror events would duplicate-render if `useGoogleCalendarEvents` didn't filter them out — keep that filter.
- Local LLM responses sometimes lack tool-calling: always go through `extractJsonFromText` fallback.
- `scheduled_start_time` is `time without time zone` — combine with `scheduled_date` carefully when constructing JS `Date` objects.
- Google Calendar `granted_scopes` may be empty for connections created before write-back was added — show a "Reconnect" banner instead of silently failing.
- The Lovable AI Gateway returns 402/429 for credit/rate issues — surface a clear toast, don't retry blindly.
