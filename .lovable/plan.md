## Add Undo for Task Deletion

When a user clicks the trash icon on a task, we'll show a toast with an "Undo" button that restores the task if clicked within ~15 seconds.

### Approach

Since `tasks` table has no soft-delete column, we'll use the **snapshot + re-insert** pattern:

1. Before deleting, capture a snapshot of the full task row (including its `id` so any references like `parent_task_id` on follow-ups remain valid).
2. Hard-delete the row from the database.
3. Show a `sonner` toast with an "Undo" action button.
4. On undo: re-insert the snapshot using its original id (preserving follow-up parent links).

This requires no schema change — it reuses the existing `tasks` table and works for both regular tasks and follow-ups.

### Changes

`**src/hooks/useTasks.ts**`

- Update `useDeleteTask` so its `mutationFn` first fetches the full row (`select * from tasks where id = ?`), then deletes it, and returns the snapshot from the mutation.
- Add a new `useRestoreTask` hook that re-inserts a task snapshot (stripping nothing — keeping the original `id`, `created_at`, etc. so it appears identical) and invalidates the `tasks` query.

`**src/components/TaskCard.tsx**`

- In `handleDelete`, after `deleteTask.mutateAsync(task.id)` resolves with the snapshot, call `toast.success("Task deleted", { action: { label: "Undo", onClick: () => restoreTask.mutateAsync(snapshot) }, duration: 6000 })`.
- Import and instantiate `useRestoreTask`.
- On successful undo, show a brief confirmation toast ("Task restored").

### Edge cases handled

- **Follow-ups of a deleted parent**: We only delete the single clicked task (current behavior). Undo restores it with its original id, so any child follow-ups that reference `parent_task_id` remain consistent.
- **User dismisses toast**: Deletion stays permanent — same as today, just with a window to undo.
- **Network failure during restore**: `restoreTask` mutation will surface an error toast via the existing pattern.

### Out of scope

- No soft-delete column / trash bin view (can be added later if you want a longer recovery window).
- Bulk-undo across multiple deletions in the same session.