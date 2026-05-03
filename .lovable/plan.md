## Goal

1. **Hide Couple Life activities from the main Tasks list by default**, with an optional toggle to show them.
2. **Sort tasks by time-to-do**: overdue (past, not done) at the top, in-progress in the middle, future-scheduled below, and done at the bottom.

Couple Life tasks are identified the same way the Couple Life page does it: tasks whose `client_tag_id` points to a tag named `"couple life"` or `"coppia"` (case-insensitive).

## Changes

### `src/pages/TasksPage.tsx`
- Resolve the couple tag id from `useClientTags()` (matching `couple life` / `coppia`, case-insensitive).
- Add a `showCouple` state (default `false`) and a small toggle/checkbox next to the existing filters: "Show couple activities".
- When `showCouple` is false, filter out tasks whose `client_tag_id === coupleTagId`.
- After filtering, sort tasks with a new helper `sortTasksByUrgency` (see below) before rendering.
- Update the header counter so totals reflect the visible (filtered) list.

### `src/lib/taskSort.ts` (new)
Add a pure helper:

```ts
export function sortTasksByUrgency(tasks: Task[]): Task[]
```

Bucket order (top → bottom):
1. **Overdue / past, not started** — `status !== "done"` and `scheduled_date < today` (or `status === "todo"` with a past date). Sort within bucket by `scheduled_date` ascending (most overdue first), then priority desc.
2. **In progress** — `status === "in-progress"`. Sort by `scheduled_date` asc (nulls last), then priority desc.
3. **Today / future, not started** — `status === "todo"` with `scheduled_date >= today` or no date. Sort by `scheduled_date` asc (nulls last), then priority desc.
4. **Done** — `status === "done"`. Sort by `updated_at` desc.

This keeps the existing priority/created_at order from the query as a stable secondary signal but reorders so urgency dominates.

### Optional polish
- Persist the `showCouple` toggle in `localStorage` so it survives reloads.
- Couple Life page itself is unchanged — couple tasks still show there.

## Out of scope
- Calendar views (Day/Week/Month) keep showing all tasks including couple ones — the request is specifically about the Tasks list.
- No DB changes.
