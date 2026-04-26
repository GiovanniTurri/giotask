# Toggle Google Calendar events in the Today agenda

Add a switch in the Today popover header (next to the "N tasks" badge area) that lets the user merge today's Google Calendar events into the agenda list alongside their tasks.

## What the user will see

In the Today popover (opened from the Today button on `/calendar`):

- A new **Include Google Calendar** switch sits just under the date header, on the same row as a small label. Default: **on**.
- The count badge becomes contextual: `N tasks · M evt` when the toggle is on and there are events; just `N tasks` when off or no events.
- The trigger button's badge counter also reflects the combined count when the toggle is on.
- The list merges tasks and Google events sorted by start time:
  - Task rows: existing behavior (click opens TaskDialog).
  - Event rows: read-only (Google events aren't editable from the app), shown with the event's color dot, title, optional `MapPin` icon if a location exists, and a small `gcal` tag on the right. All-day events show "All day" in the time column and sort first.
- Empty state shown only when both lists are empty (after applying the toggle).

## Technical implementation

Two files touched, no new deps, no DB or backend changes.

### `src/components/calendar/CalendarHeader.tsx`
- Add prop `googleEvents?: GoogleEvent[]` (same minimal shape already used in `DayView`: `id, title, start_time, end_time, all_day, color, location`).
- Local state: `includeGEvents` (default `true`), via `useState`.
- Compute `todayEvents = googleEvents.filter(e => isSameDay(new Date(e.start_time), new Date()))`.
- Merge into a unified `items` array of `{ kind: 'task' | 'event', sortKey, ... }` sorted by `sortKey` (HH:MM:SS string; all-day events get `00:00:00`).
- Render header with the existing date block + count badge plus a new row containing a `<Label>` and `<Switch>` (`@/components/ui/switch`, already in the project) bound to `includeGEvents`.
- Extract `TaskRow` (existing AgendaRow renamed) and add `EventRow` component (non-clickable `<div>` with color dot from `event.color ?? '#4285f4'`, title, optional `MapPin` icon, `gcal` label).
- Trigger button badge count = tasks + (toggle ? events : 0).

### `src/pages/CalendarPage.tsx`
- Pass the already-fetched `googleEvents={googleEvents || []}` to `CalendarHeader` (the page already calls `useGoogleCalendarEvents` for the active view's date range; today is included whenever the current view contains today, which is the common case — when it doesn't, the agenda simply shows zero events and the toggle still works).

## Out of scope
- No fetching of a separate "today" range when the calendar view doesn't include today. If we later need guaranteed today coverage regardless of view, we can add a second small `useGoogleCalendarEvents(todayStart, todayEnd)` query — let me know if you want that.
- No editing/clicking through Google events; they remain read-only as elsewhere in the app.