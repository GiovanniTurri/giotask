## Plan: Age-Based Task Color Indicators

### Concept

Tasks that have been **scheduled but not completed** for a long time should visually "age" — turning warmer/more urgent colors as they sit untouched on the calendar. This applies to tasks where `scheduled_date` is in the past (overdue) relative to today.

### Color Tiers


| Age (days past `scheduled_date`) | Color             | Meaning              |
| -------------------------------- | ----------------- | -------------------- |
| 0–6 days overdue                 | Default tag color | Fresh / on track     |
| 7–13 days overdue                | Amber tint        | Needs attention      |
| 14–20 days overdue               | Orange tint       | Getting stale        |
| 21+ days overdue                 | Red tint          | Critical / abandoned |


Done tasks are excluded (they keep the dimmed/strikethrough style).
Follow-up tasks follow the same rules but keep their dashed border.

### Implementation Approach

Rather than running a daily database job (which would mutate user data and conflict with the tag-based color system), we compute the "age color" **on the client at render time**. This way:

- It updates automatically every day with no cron needed
- The user's chosen tag colors are preserved in the database
- Aging works on every view (calendar + task list) consistently

### Changes

**1. New helper: `src/lib/taskAge.ts**`

- `getTaskAgeStatus(scheduled_date, status)` returns `'fresh' | 'warn7' | 'warn14' | 'critical21'`
- `getAgeColor(status)` returns an HSL color override for warn/critical tiers
- Returns `null` for fresh or done tasks (use default tag color)

**2. `src/index.css**`

- Add semantic CSS tokens: `--task-age-warn` (amber), `--task-age-stale` (orange), `--task-age-critical` (red) in both light and dark theme blocks

**3. `src/components/calendar/TaskBlock.tsx**`

- Apply age color override to `backgroundColor` and `borderLeft` when age status is not fresh
- Keep follow-up dashed border behavior intact
- Tooltip appends "Overdue X days" when applicable

**4. `src/components/TaskCard.tsx**`

- Add a small colored dot or left border stripe matching the age tier
- Add a subtle "Overdue Nd" badge for warn14 and critical21

**5. Optional legend in calendar header** *(small, can skip if you prefer minimal UI)*

- A compact legend chip showing the 3 age colors with labels

### Files Modified

- `src/lib/taskAge.ts` (new)
- `src/index.css` — add 3 semantic color tokens
- `src/components/calendar/TaskBlock.tsx` — apply age color
- `src/components/TaskCard.tsx` — add age indicator

### Out of Scope

- Daily background job (not needed — colors recompute on every render based on today's date)
- Notifications/emails for overdue tasks (can add later)
- Per-user threshold customization (uses fixed 7/14/21 day tiers)