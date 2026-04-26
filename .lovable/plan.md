# Add "Don't forget" action to Reschedule button

Convert the existing **Reschedule All** button on the Calendar page into a split dropdown menu so the user can pick between two actions:

1. **Reschedule All (AI)** — current behavior (calls the AI scheduler).
2. **Don't forget** — new action that finds every overdue task (status not `done` and `scheduled_date` before today) and moves them to **yesterday**, so they appear right before today and are easier to drag/reschedule manually.

## UX

In `src/pages/CalendarPage.tsx`, replace the single `Button` with a `DropdownMenu` next to the view tabs:

```text
[ ✨ Schedule ▾ ]   [ Month | Week | Day ]
   ├── Reschedule All (AI)
   └── Don't forget (move overdue to yesterday)
```

- Use the existing `Sparkles` icon for the AI option.
- Use a `BellRing` (or `AlertCircle`) icon for "Don't forget".
- Show a confirmation toast like *"Moved N overdue tasks to yesterday"* (or *"No overdue tasks"* when nothing matched).
- Disable the menu while either action is running (`isScheduling || isMovingOverdue`).

## Data logic — "Don't forget"

Add a small handler in `CalendarPage.tsx` (or a new tiny hook `useMoveOverdueTasks` for cleanliness):

1. Compute today (`yyyy-MM-dd`) and yesterday using `date-fns` (`subDays(new Date(), 1)` + `format`).
2. Query Supabase:
   ```ts
   supabase
     .from("tasks")
     .select("id")
     .neq("status", "done")
     .not("scheduled_date", "is", null)
     .lt("scheduled_date", today)
   ```
3. For each returned id, call the existing `useUpdateTask` mutation with `{ scheduled_date: yesterday }`. Keep `scheduled_start_time` untouched so the user only adjusts the date when re-dragging.
4. Invalidate the `tasks` query (already handled by `useUpdateTask.onSuccess`).
5. Toast the count.

No edge function or schema change is needed — the `tasks` table already has `scheduled_date` and the RLS policy allows updates.

## Files to change

- `src/pages/CalendarPage.tsx` — replace the single button with a `DropdownMenu` + add `handleMoveOverdue` handler and `isMovingOverdue` state.

## Out of scope

- No changes to the AI scheduler flow, prompt, or edge function.
- No new DB columns, no migrations.
- The action only moves tasks that already had a scheduled date in the past; unscheduled tasks are left alone.
