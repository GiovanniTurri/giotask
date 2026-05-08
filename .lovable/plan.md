# Long-press to create a task in /calendar

Add a long-press (≈500 ms) gesture on the Day, Week, and Month calendar grids that opens the existing `TaskDialog` pre-filled with the date and time the user pressed on. Works with both mouse and touch, so it feels native on mobile and desktop.

## Behavior

- **Day view & Week view (time grids)**: long-press on an empty area of a day column → open New Task dialog with `scheduled_date` = that day and `scheduled_start_time` snapped to the nearest 15 min based on the Y position. Default `time_estimate` = 60 min.
- **Month view (cells)**: long-press on a day cell → open New Task dialog with `scheduled_date` set, no start time. (Tap-to-zoom into the day stays as today.)
- **Threshold**: 500 ms hold without moving more than ~8 px. Cancel on pointer move beyond threshold, scroll, pointer leave, or right-click.
- **Visual feedback**: while pressing, show a subtle pulsing ring/highlight on the target slot so the user knows the gesture is in progress. Use a small ring of the primary color, fades in over 150 ms.
- **Conflict avoidance**:
  - Long-press is ignored if the press starts on an existing task block, Google event block, or the day-cell number (those keep their current click behavior — open task / zoom into day).
  - On Day/Week, the existing drag-and-drop on task blocks is preserved (gesture only triggers from empty grid area).
  - Single short tap/click on empty grid does nothing (current behavior preserved); only the long-press triggers the dialog. This avoids accidental creation when scrolling on mobile.
- Works on desktop with mouse-hold and on mobile with touch-hold (uses Pointer Events to cover both).

## Technical implementation

Files to add / change:

1. **New hook `src/hooks/useLongPress.ts`**
   - Returns pointer event handlers (`onPointerDown`, `onPointerMove`, `onPointerUp`, `onPointerCancel`, `onPointerLeave`, `onContextMenu`).
   - Configurable `delay` (default 500 ms) and `moveThreshold` (default 8 px).
   - Calls `onLongPress(event)` after the timeout if the pointer hasn't moved beyond threshold.
   - Suppresses the trailing `click`/context menu after a successful long-press.
   - Touch: also calls `e.preventDefault()` on `pointerdown` only when needed to stop iOS callout (use CSS `touch-action: manipulation` and `user-select: none` on the grid container).

2. **`src/pages/CalendarPage.tsx`**
   - Add state `creatingTaskDefaults: { scheduled_date: string; scheduled_start_time?: string } | null`.
   - Add handler `handleLongPressSlot(date, hour?, minute?)` that sets defaults and opens `TaskDialog` (reuse the existing `dialogOpen`/`editingTask` state — when creating, `editingTask = null` and pass `initialValues`).
   - Pass new prop `onLongPressSlot` to `MonthView`, `WeekView`, `DayView`.
   - Render `<TaskDialog>` with both `task={editingTask}` and `initialValues={creatingTaskDefaults ?? undefined}`. Reset defaults when dialog closes.

3. **`src/components/calendar/DayView.tsx` & `WeekView.tsx`**
   - On the day column container, attach long-press handlers from `useLongPress`.
   - In the long-press callback, compute hour & minute from the pointer Y offset (mirror existing drop-position math) and snap minute to nearest 15.
   - Skip if `event.target` is inside a task block or google event block (check via `closest('[data-task-block], [data-google-event]')`).
   - Add `data-task-block` / `data-google-event` data attributes to the absolute-positioned wrappers so the check is reliable.
   - Add a small overlay div positioned at the press location showing a pulsing highlight (controlled via local state `pressIndicator: { top, height } | null`).

4. **`src/components/calendar/MonthView.tsx`**
   - Wrap each day cell with long-press handlers; on trigger, call `onLongPressSlot(dateStr)` (no time).
   - Existing `onClick={() => onDayClick(day)}` is preserved for short clicks.
   - Suppress the click that would otherwise follow a long-press.

5. **`src/components/TaskDialog.tsx`** — no behavior change needed; it already accepts `initialValues` for `scheduled_date`, `scheduled_start_time`, `time_estimate`, etc. We will simply pass those values from the new flow.

## Edge cases handled

- Scrolling the time grid on mobile must not trigger creation → cancel on pointer move beyond threshold and on `scroll` of the scroll container.
- Right-click on desktop must not trigger long-press → ignore non-primary buttons.
- Long-pressing on an existing task or Google event still opens that task / does nothing (no conflict).
- After long-press fires, suppress the synthetic click so the dialog doesn't reopen or the day doesn't zoom in MonthView.
- Cleanup timers in `useEffect` return to avoid leaks on unmount.

## Out of scope

- No drag-to-define-duration (keep MVP: fixed 60 min default, user can change in dialog).
- No haptic feedback API (optional polish; can be added later via `navigator.vibrate(15)` on long-press fire — happy to include if you want).
