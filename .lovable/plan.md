## Goal

Add a **Sort by** menu in the Tasks page so the user can choose how the task list is ordered. The current "urgency" sort stays as the default, but additional options become available.

## Sort options

1. **Urgency** (default — current behavior: overdue → in-progress → future/undated → done)
2. **Recently updated** — `updated_at` descending (last edited first)
3. **Scheduled date (soonest)** — `scheduled_date` ascending, undated last

All options keep the existing "Show couple activities" filter and the status / tag filters intact — sorting is applied to the already-filtered list.

## Implementation

### 1. Extend `src/lib/taskSort.ts`

- Keep `sortTasksByUrgency` as-is.
- Add a `TaskSortMode` union type with the 3 keys above (`"urgency" | "updated-desc" | "scheduled-asc"`).
- Add `SORT_OPTIONS: { value: TaskSortMode; label: string }[]` for the dropdown.
- Add `sortTasks(tasks, mode)` that dispatches to the right comparator. Each comparator is pure and handles `null`/missing values by pushing them to the end (except for date-asc, where missing dates also go last).

### 2. Update `src/pages/TasksPage.tsx`

- Add `sortMode` state, default `"urgency"`, persisted to `localStorage` under key `tasks.sortMode` (mirrors the existing `tasks.showCouple` pattern).
- Replace the `sortTasksByUrgency(base)` call inside `visibleTasks` with `sortTasks(base, sortMode)`.
- Add a third `Select` in the filter row (next to Status and Tag filters), labeled implicitly via its placeholder, showing the current sort. Use `SORT_OPTIONS` to render `SelectItem`s.
- Layout: keep Status + Tag + new Sort selects grouped on the left, with the "Show couple activities" switch staying on the right (`ml-auto`).

### 3. No backend / DB changes

Sorting is fully client-side. The `useTasks` query continues to fetch with its current ordering — the client re-sorts after filtering. This keeps things simple and avoids extra network calls when the user changes sort mode.

## Files touched

- `src/lib/taskSort.ts` — add types, options array, and `sortTasks` dispatcher with new comparators.
- `src/pages/TasksPage.tsx` — add sort state + persistence, render the sort `Select`, swap the sort call.