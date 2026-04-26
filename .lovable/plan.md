# Today Agenda Popover

Make the existing **Today** button on the Calendar header double as a quick-look popover listing all tasks scheduled for today (Google Calendar–style agenda widget), while still keeping its current behavior of jumping the calendar to today.

## What the user will see

Clicking **Today** opens a popover anchored under the button containing:

- A header: "Today — {Weekday, Mon D}" with a count badge (e.g. "5 tasks").
- A compact, scrollable list of today's tasks ordered by `scheduled_start_time` (untimed tasks shown last under an "Anytime" subheader).
- Each row shows: time (e.g. `09:30`) or `—`, colored dot from client tag / age, title, and `Xm` duration. Done tasks are struck through and dimmed. Follow-ups show a small mail icon. Overdue indicator is omitted (today only).
- Clicking a row opens the existing `TaskDialog` for that task (popover closes).
- Footer button: **Go to today** which performs the original behavior (`setCurrentDate(new Date())` + switch to Day view) and closes the popover.
- Empty state: "Nothing scheduled for today." with the same Go to today button.

The popover does NOT auto-jump the calendar — the agenda is the primary action of clicking Today; the user explicitly chooses to navigate via the footer. This avoids losing their current month/week context just to peek at today.

## Technical implementation

Single-file change: **`src/components/calendar/CalendarHeader.tsx`**, plus prop wiring in **`src/pages/CalendarPage.tsx`**.

### `CalendarHeader.tsx`
- Replace the plain `Today` button with a `Popover` (`@/components/ui/popover`) whose `PopoverTrigger` is a `Button` styled identically to today's outline button.
- New props on the component:
  - `tasks: (Task & { client_tags?: { name: string; color: string } | null })[]`
  - `onTaskClick: (task: any) => void`
- Inside `PopoverContent` (align="start", w-80):
  - Compute `todayTasks = tasks.filter(t => t.scheduled_date && isSameDay(parseISO(t.scheduled_date), new Date()))`.
  - Sort by `scheduled_start_time` ascending; nulls last.
  - Render a `ScrollArea` (max-h-80) with rows. Each row is a button:
    - Left: time label `t.scheduled_start_time?.slice(0,5) ?? '—'` in `text-xs tabular-nums w-12`.
    - Color dot using `task.client_tags?.color ?? 'hsl(var(--primary))'`.
    - Title (truncate) + follow-up `Mail` icon if `task_kind === 'follow_up'`.
    - Right: `{time_estimate}m` muted.
  - Footer: `Button variant="ghost" size="sm"` "Go to today" calling `onToday()` then closing popover via controlled `open` state.

### `CalendarPage.tsx`
- Pass `tasks={tasks ?? []}` and `onTaskClick={handleTaskClick}` to `CalendarHeader`.
- `handleTaskClick` already opens the `TaskDialog`; reuse as-is.

### Behavior notes
- Controlled `open` state in `CalendarHeader` so row/footer clicks can close it.
- No new dependencies; uses existing `Popover`, `ScrollArea`, `Button`, `lucide-react` icons, and `date-fns`.
- No DB or schema changes.

## Out of scope
- No changes to drag/drop, AI scheduling dropdown, or Google events display.
- Google Calendar events are NOT included in the popover (only app tasks), matching the existing "tasks" focus of the calendar grid; can be added later if desired.