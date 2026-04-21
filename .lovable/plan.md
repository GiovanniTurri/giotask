

## Plan: Time-of-Day Scheduling + In-App Reminder Notifications

### Part 1 — Add Hour/Minute to Tasks

Currently `TaskDialog` only edits `scheduled_date` even though the database already has a `scheduled_start_time` column (used by the AI scheduler and calendar). We'll expose it in the UI.

**Changes in `src/components/TaskDialog.tsx`:**
- Add a `scheduledStartTime` state (string `"HH:MM"`).
- Load it from `task.scheduled_start_time` on open (strip seconds).
- Render a new `<Input type="time">` next to the date picker.
- Include `scheduled_start_time: scheduledStartTime ? scheduledStartTime + ":00" : null` in the payload.
- Apply the same field to follow-up tasks (optional time, defaults to parent's time).

**TaskCard / TaskBlock:** already display `scheduled_start_time` when present — no change needed.

---

### Part 2 — In-App Reminder Notifications

#### Approach: Web Notifications API (works in browser + installed PWA on Android/iOS 16.4+)

True native push (FCM/APNs) requires Capacitor + app-store builds, which is out of scope for the current web app. The Web Notifications API covers all 3 targets the user mentioned (browser, Android via PWA, iOS via installed PWA) without backend infrastructure.

#### Mechanism

1. **Permission**: On first use, request `Notification.requestPermission()`.
2. **Per-task lead time**: Add `reminder_minutes` column to `tasks` (nullable int, default `null` = no reminder). Editable in TaskDialog (dropdown: Off / 5 / 10 / 15 / 30 / 60 min, plus custom).
3. **Global default**: Add a "Default reminder lead time" setting on the Settings page (stored in `llm_config` or a new `user_settings` row — we'll add a small `user_settings` table).
4. **Scheduler hook** (`src/hooks/useReminders.ts`, new):
   - On app load and whenever tasks change, query all tasks with `scheduled_date + scheduled_start_time + reminder_minutes` in the future.
   - For each, compute fire time = `scheduledDateTime - reminder_minutes`.
   - Use `setTimeout` for reminders due within the next 24h; re-evaluate every hour.
   - Track fired reminder IDs in `localStorage` to avoid duplicates across reloads.
   - Fire via `new Notification(title, { body, icon, tag: task.id })`.
5. **Fallback**: If permission denied or browser unsupported, show a toast at fire time while the app is open.

#### Limitations (will be communicated to the user)
- Web notifications only fire while the browser/PWA is at least running in the background. For reminders that fire when the app is fully closed, a native build (Capacitor + FCM/APNs) or a server-side push is required — we can plan that as a follow-up.
- iOS requires the app be **installed to home screen** for notifications to work.

---

### Database Changes

```sql
ALTER TABLE tasks ADD COLUMN reminder_minutes integer;

CREATE TABLE user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  default_reminder_minutes integer DEFAULT 10,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on user_settings" ON user_settings FOR ALL USING (true) WITH CHECK (true);
```

---

### Files Modified / Created

- `supabase/migrations/<new>.sql` — schema above
- `src/components/TaskDialog.tsx` — add time input + reminder dropdown
- `src/hooks/useReminders.ts` (new) — schedule + fire notifications
- `src/hooks/useUserSettings.ts` (new) — default reminder lead time
- `src/App.tsx` — mount `useReminders()` once at root
- `src/pages/SettingsPage.tsx` — "Notifications" section: enable button + default lead time selector
- `src/components/TaskCard.tsx` — small bell icon + "in Xm" badge when reminder set

### Out of Scope
- True background push when the app is closed (needs Capacitor / server push)
- Snooze / dismiss actions on the notification
- Per-tag default reminder times

