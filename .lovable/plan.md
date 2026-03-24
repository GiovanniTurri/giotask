
# TaskFlow — Project Plan & Change Log

## Architecture Overview

TaskFlow is a task scheduling app built with React + Vite + Tailwind + TypeScript, backed by Lovable Cloud (Supabase). It features AI-powered task scheduling via three provider options, Google Calendar integration, and a calendar view.

### Key Technologies
- **Frontend**: React 18, React Router, TanStack Query, shadcn/ui, Tailwind CSS
- **Backend**: Lovable Cloud (Supabase) — tables, edge functions, no auth (public app)
- **AI Scheduling**: Three providers — Lovable AI (built-in), Cloud LLM (OpenAI-compatible), Local LLM (LM Studio/Ollama)

### Database Tables
- `tasks` — Core task data (title, description, priority, time_estimate, status, scheduled_date/time, client_tag_id)
- `client_tags` — Color-coded tags for categorizing tasks
- `llm_config` — Single-row config for AI provider settings (active_provider, cloud/local endpoints, keys, models)
- `google_calendar_connections` — OAuth tokens for Google Calendar
- `google_calendar_events` — Synced Google Calendar events

### Edge Functions
- `schedule-tasks` — AI scheduling for lovable/cloud providers (tool-calling approach)
- `google-calendar-auth` — Google OAuth flow
- `google-calendar-sync` — Sync events from Google Calendar

---

## Completed Changes

### 1. Fix Local LLM Scheduling (LM Studio Compatibility)

**Problem**: LM Studio with models like `google/gemma-3-12b` returned `'messages' field is required` because it doesn't support OpenAI `tools`/`tool_choice` fields. These unsupported fields caused the entire request body parsing to fail.

**Solution**: For local LLMs, dropped tool calling entirely and switched to raw JSON responses parsed from `message.content`.

**Files Modified**:

#### `src/lib/schedulerPrompt.ts`
- Added `buildLocalSystemPrompt(today)` — instructs local models to return a raw JSON array without markdown, tool calls, or explanations
- Existing `buildSystemPrompt()` and `schedulerToolDef` unchanged (used by cloud/lovable providers)
- `formatTasksForPrompt()` maps task rows to a clean schema for prompts

#### `src/hooks/useAiScheduler.ts`
- **`normalizeLocalEndpoint()`** — auto-appends `/v1/chat/completions` to bare URLs or `/v1` paths
- **`parseSchedulePayload()`** — accepts both `ScheduleEntry[]` and `{ schedule: ScheduleEntry[] }` formats
- **`extractMessageText()`** — handles string content and multipart content arrays
- **`extractJsonFromText()`** — strips markdown code fences, finds first JSON array/object, sanitizes trailing commas and control chars
- **`fetchLocalSchedule()`** — sends requests WITHOUT `tools`/`tool_choice`; uses `buildLocalSystemPrompt`; implements a two-attempt strategy:
  1. Standard `system` + `user` message pair
  2. Fallback: single `user` message combining prompt + tasks (for servers that don't support system role)
- Response parsing: checks `tool_calls` first (for servers that do support it), then falls back to `extractJsonFromText(message.content)`
- Cloud/lovable providers still use the edge function (`schedule-tasks`) with tool calling — no changes

#### `supabase/functions/schedule-tasks/index.ts`
- Added same `parseSchedulePayload()` and `extractJsonFromText()` helpers for robustness
- Cloud provider responses now also fall back to content parsing if tool_calls are absent

### 2. Default Dark Theme

**Problem**: App defaulted to light theme on first visit.

**Solution**: Set dark mode as default when no theme preference is saved.

**Files Modified**:

#### `src/main.tsx`
- Reads `localStorage.theme` before render; defaults to dark if no saved preference
- Toggles `dark` class on `document.documentElement` immediately to prevent flash

#### `src/components/AppSidebar.tsx`
- `getInitialDarkMode()` returns `true` by default (dark) unless explicitly set to `"light"`
- `useDarkMode()` hook persists preference to localStorage and toggles the `dark` class

---

## App Structure

### Pages
- `/` — TasksPage (task list with AI scheduling, tag filtering)
- `/calendar` — CalendarPage (day/week/month views with Google Calendar overlay)
- `/settings` — SettingsPage (AI provider config, Google Calendar connection)
- `/privacy` — PrivacyPolicyPage
- `/terms` — TermsOfServicePage

### Key Components
- `AppSidebar` — Fixed sidebar nav with dark mode toggle
- `TaskCard` — Individual task display with edit/delete
- `TaskDialog` — Create/edit task form
- `TagManager` — CRUD for client tags
- `SchedulePreview` — Preview AI-generated schedule before applying
- `CalendarHeader`, `DayView`, `WeekView`, `MonthView` — Calendar components
- `GoogleCalendarSettings` — OAuth connection management
- `GoogleEventBlock`, `TaskBlock` — Calendar event renderers

### Key Hooks
- `useTasks` — CRUD operations for tasks via TanStack Query
- `useAiScheduler` — AI scheduling logic (local/cloud/lovable routing)
- `useLlmConfig` — Read/update LLM configuration
- `useGoogleCalendar` — Google Calendar event queries
- `useClientTags` — Tag management

### AI Scheduling Flow
1. User clicks "AI Schedule" on TasksPage
2. `useAiScheduler.fetchSchedule()` checks `active_provider` from `llm_config`
3. **Local**: Direct browser fetch to local endpoint (no tools, JSON parsing from content)
4. **Cloud/Lovable**: Invokes `schedule-tasks` edge function (tool calling with fallback)
5. Returns `ScheduleEntry[]` → shown in `SchedulePreview`
6. User clicks "Apply" → `applySchedule()` updates each task's `scheduled_date` and `scheduled_start_time`
