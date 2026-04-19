

## Add Follow-Up Write Tasks to Calendar

### Concept

A "follow-up write" is a new task automatically created from a parent task (the "event"). It is scheduled some time after the parent, contains a pre-filled message body, and is visually linked to the parent in the calendar.

To answer your questions:
- **Yes** — follow-ups should display as separate calendar entries, visually distinct (a dashed border + envelope icon) and grouped with their parent via a shared `parent_task_id`.
- **Yes** — multiple follow-ups per parent are supported; each row in the dialog represents one follow-up with its own delay + message.

### Data Model

Add columns to the existing `tasks` table (no new table — keeps it simple):
- `parent_task_id uuid` — points to the parent task (null for normal tasks)
- `task_kind text` default `'task'` — values: `'task'`, `'follow_up'`
- `follow_up_message text` — pre-filled draft message body

A migration will add these columns.

### UX Flow

**1. TaskDialog gets a new "Follow-up writes" section** (visible only for non-follow-up tasks):
- Toggle "Add follow-up write" reveals a list editor
- Each row: delay preset (`1 week after`, `2 weeks after`, `1 month after`, `Custom date`), suggested message textarea (auto-prefilled with `"Hi {tag name}, hope everything went well after our {title}!"`), remove button
- "+ Add another follow-up" button for multiple entries
- On save: parent task is created/updated, then each follow-up is upserted as a separate task with `parent_task_id`, `task_kind='follow_up'`, `scheduled_date` computed from parent + delay, `time_estimate=15`, title `"Follow up: {parent title}"`

**2. Calendar visual linking**:
- `TaskBlock` adds a dashed border + small envelope icon when `task_kind='follow_up'`
- Hovering shows the parent title in the tooltip
- Same client tag color as parent for visual grouping

**3. TaskCard on the Tasks page**:
- Shows envelope icon + "Follow-up to: {parent title}" when applicable
- Parent task shows badge "{N} follow-ups scheduled" with a small expand to preview them

### Files Modified

- **DB migration** — add `parent_task_id`, `task_kind`, `follow_up_message` to `tasks`
- **`src/components/TaskDialog.tsx`** — add follow-up editor section + creation logic
- **`src/components/calendar/TaskBlock.tsx`** — dashed border + envelope icon for follow-ups
- **`src/components/TaskCard.tsx`** — show follow-up linkage and count
- **`src/hooks/useTasks.ts`** — minor: include new fields (auto via regenerated types)

### Out of Scope (can add later)
- Sending the actual message (this is a writing reminder, not an email-sender)
- Recurring follow-up cascades
- Editing the parent does not retroactively shift existing follow-up dates

