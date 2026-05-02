
# Mirror Tasks as "Focus" Blocks to Google Calendars

## Goal

When a task is scheduled in this app, automatically create a corresponding event titled **"Focus"** on selected linked Google Calendars — hiding the real task name while still blocking the time on your other calendars (work, personal, shared). When the task is rescheduled, moved, or deleted, the mirror event updates or disappears with it.

## Current state

- Google integration is **read-only** today (scope: `calendar.readonly`). It can list events but cannot create/update/delete them.
- Each linked Google account stores `selected_calendars` (which calendars to **read**).
- Tasks have `scheduled_date` + `scheduled_start_time` + `time_estimate` — enough to derive a start/end window.

## What changes

### 1. Upgrade OAuth scope to read/write

- Replace `calendar.readonly` with `https://www.googleapis.com/auth/calendar.events` in `google-calendar-auth`.
- Existing connections will need to **reconnect once** to grant the new scope. We'll show a banner in Settings when a connection is missing the write scope, with a "Reconnect" button.

### 2. New per-connection "mirror" settings

Add to `google_calendar_connections`:
- `mirror_enabled boolean default false` — master switch for that account.
- `mirror_target_calendar_id text` — which calendar to write the "Focus" blocks into (defaults to `primary`). Choose from the same list already fetched in `list_calendars`.
- `mirror_label text default 'Focus'` — what to call the events (user can change to e.g. "Busy", "Deep work").
- `mirror_visibility text default 'private'` — Google visibility flag (`private` keeps details hidden on shared calendars).

UI: extend `GoogleCalendarSettings.tsx` — for each linked account add:
- Toggle: "Mirror my tasks to this calendar as Focus blocks"
- Dropdown: target calendar
- Text field: label (default "Focus")
- Help text explaining what gets written and the "private" visibility.

### 3. Track the mirror events

New table `task_calendar_mirrors`:
- `id`, `task_id`, `connection_id`, `calendar_id`, `google_event_id`, `created_at`, `updated_at`.
- Unique on (`task_id`, `connection_id`) — one mirror per task per connected account.
- RLS: allow all (matches the rest of the project's single-user model).

This lets us update/delete the right Google event when the task changes, instead of creating duplicates.

### 4. New edge function: `google-calendar-mirror`

Single function with three actions:
- `upsert` — given a `task_id`, for every connection with `mirror_enabled = true`:
  - Compute start = `scheduled_date` + `scheduled_start_time`, end = start + `time_estimate` minutes.
  - If a row exists in `task_calendar_mirrors` → `PATCH` the Google event.
  - Else → `POST` a new event with summary = `mirror_label`, visibility = `private`, no description, no location, then store the returned `google_event_id`.
  - Skip the connection if the task has no `scheduled_start_time` (we don't mirror unscheduled or all-day-only tasks in v1).
- `delete` — given a `task_id`, delete every Google event referenced in `task_calendar_mirrors` for that task, then clear the rows.
- `backfill` — given a `connection_id`, upsert mirrors for all currently scheduled, non-done tasks (used right after the user enables mirroring).

Reuses the same `getValidAccessToken` refresh logic already in `google-calendar-sync`.

### 5. Wire it into task lifecycle

In `useTasks.ts` mutation hooks (`useUpdateTask`, `useCreateTask`, `useDeleteTask`):
- After a successful create/update where the task is scheduled with a start time → fire-and-forget `supabase.functions.invoke('google-calendar-mirror', { body: { action: 'upsert', task_id }})`.
- After a successful delete → call with `action: 'delete'`.
- Same hook from `useAiScheduler.applySchedule` after the bulk schedule is committed (one upsert call per affected task, or extend the function to accept a list).

Errors are logged but don't block the UI — mirroring is best-effort.

### 6. Visual cue in the calendar views

The user's own mirror events will come back through the existing read sync as Google events titled "Focus" on their other calendars. To avoid showing them as duplicate blocks **inside this app**, filter them out in `useGoogleCalendarEvents` / the calendar views: hide Google events whose `google_event_id` is referenced in `task_calendar_mirrors`.

## Concerns / FAQ

**Will this spam my work calendar?** Only the calendar you pick as the target, only when mirroring is toggled on, and only for tasks with a scheduled start time. You can disable per-account at any time.

**Will my colleagues see the task name?** No — the event title is just "Focus" (or whatever label you choose) and visibility is set to `private`. Google shows it as a busy block on shared free/busy views.

**What if I delete a task?** The corresponding Focus event is deleted from every linked calendar.

**Existing scheduled tasks?** When you flip the mirror toggle on, we run a one-time backfill so they appear immediately.

**v1 limitations:** All-day tasks and tasks without a start time are not mirrored. We only mirror to one target calendar per connected account (not multiple at once).

## Technical summary

- Migration: add columns to `google_calendar_connections`, create `task_calendar_mirrors`.
- `supabase/functions/google-calendar-auth/index.ts`: scope change to `calendar.events`, add `update_mirror_settings` action.
- `supabase/functions/google-calendar-mirror/index.ts`: new function (upsert/delete/backfill).
- `src/hooks/useGoogleCalendar.ts`: add `useUpdateMirrorSettings`, `useBackfillMirror`.
- `src/hooks/useTasks.ts`: invoke mirror function on create/update/delete.
- `src/hooks/useAiScheduler.ts`: invoke mirror on apply.
- `src/components/GoogleCalendarSettings.tsx`: per-connection mirror controls + reconnect banner when scope missing.
- Calendar views: filter out events whose `google_event_id` is in `task_calendar_mirrors` to prevent duplicate rendering.
