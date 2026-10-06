## Goal

Stop the reminder system from keeping the backend awake around the clock, so it uses fewer credits. Your plan is adapted below to how this app actually stores reminders.

## Step 0: Check what's scheduled now

The backend was asleep while this plan was written, so the current scheduled jobs couldn't be read. The first step is to list them: the every-minute reminder job (`send-due-reminders`) and the 6-hour Google Calendar sync. The final schedule depends on what's found.

## Changes

1. **Reminder job: every 30 min, 08:00–20:00 Rome only.** Unschedule the every-minute job and add one on `*/30 6-19 * * *` (UTC). That's at most 28 runs a day instead of 1,440, and none at night.
2. **Skip the call when nothing is due.** The job's SQL calls the reminder function only when this check finds something:
   `EXISTS (SELECT 1 FROM reminder_queue WHERE sent_at IS NULL AND fire_at <= now() + interval '30 min')`.
   This app uses `reminder_queue.fire_at` / `sent_at`, not `remind_at` / `reminder_sent_at`.
3. **Catch up missed reminders.** In `send-due-reminders`, drop the 1-hour lower bound so a reminder due during the night is sent at 08:00 instead of being lost. Also send reminders due within the next 30 minutes, since a run can come up to 30 minutes late. The client sync already skips reminders more than 15 minutes in the past. That limit stays for new rows only, so the night backlog still goes out.
4. **Never send twice.** This already works: each reminder is stamped with `sent_at` and dead push subscriptions are removed. No change needed.
5. **Combine background jobs.** Move the Google Calendar sync from every 6 hours to the morning run (05:00 UTC) plus one midday run. Merge it with any other daily jobs found in Step 0.
6. **Less refreshing from the app itself.** No live-update channels exist today. Set the shared query cache to `staleTime: 5 min` and `refetchOnWindowFocus: false`.
7. **Honest reminder settings.** In the task dialog, the start time snaps to :00/:30 (`step=1800`). Add a note: "Reminders are sent between 08:00 and 20:00 and may arrive up to 30 min early or late." Add the same note in Settings next to the reminder section.

## Trade-off

Reminders can be off by up to 30 minutes, and none arrive at night. To tighten this to 15 minutes, change `*/30` to `*/15`. That's about 48 runs a day, which is still small.

## Technical details

- Change the cron with `run_sql`, not a migration, because it contains the project URL and key. Use `cron.unschedule` for the old job, then `cron.schedule` with `SELECT CASE WHEN EXISTS(...) THEN net.http_post(...) END`.
- Files: `supabase/functions/send-due-reminders/index.ts`, `src/App.tsx` (QueryClient defaults), `src/components/TaskDialog.tsx`, `src/pages/SettingsPage.tsx`.
- Update the memory notes on Google sync timing and reminder delivery.
