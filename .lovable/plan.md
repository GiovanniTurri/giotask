

## Fix Calendar Task Block Sizing and Positioning

### Problems Identified

**1. All tasks without a `scheduled_start_time` default to 9 AM**
In both `WeekView` (line 37) and `DayView` (line 43), tasks with no `scheduled_start_time` are assigned to the 9 AM slot:
```
if (!t.scheduled_start_time) return hour === 9;
```
This causes all unscheduled tasks to pile into one cell.

**2. Task blocks don't visually span multiple hour rows**
The wrapper `div` around `TaskBlock` uses `minHeight` (e.g., `${blocks * 48}px`), but it sits *inside* a single hour cell. CSS `min-height` alone doesn't make a block overflow into the next hour rows — it just stretches the current cell, pushing other tasks down within the same slot. The block never visually spans across hour boundaries.

**3. `TaskBlock` itself has no height awareness**
`TaskBlock` is a simple `truncate` div with padding. It doesn't fill its parent's height, so even the `minHeight` on the wrapper has limited visual effect — the colored block appears small regardless.

### Solution

Switch to **absolute positioning** within a time-grid layout, similar to how Google Calendar renders events. Each task gets a `top` (based on start minute) and `height` (based on duration) computed in pixels relative to the hour-row height.

### Changes

**1. `src/components/calendar/WeekView.tsx`**
- Set each hour row to a fixed height (e.g., 60px) instead of `min-h-[52px]`.
- Make the day column cells `position: relative` with full height.
- Remove per-hour task filtering. Instead, render all tasks for the day once in a single overlay container.
- Position each task with `position: absolute`, computing `top` from `(startHour - firstHour) * rowHeight + (startMinute / 60) * rowHeight` and `height` from `(time_estimate / 60) * rowHeight`.
- For tasks without `scheduled_start_time`, default to 9:00 but keep the visual sizing correct.
- Handle overlapping tasks by giving them partial width offsets.

**2. `src/components/calendar/DayView.tsx`**
- Same absolute-positioning approach as WeekView.
- Use the wider single-column layout to render tasks with full width.

**3. `src/components/calendar/TaskBlock.tsx`**
- Add `h-full` so the component fills whatever height its parent provides.
- Remove `truncate` when not in compact mode, allow text wrapping for tall blocks.
- Show start time on the block when there's enough space.

### Technical Details

```
Row height constant: 60px
Task top = (taskStartHour - FIRST_HOUR) * 60 + (taskStartMinutes / 60) * 60
Task height = (time_estimate / 60) * 60  (min 20px)
```

Each day column becomes a single `relative` container spanning all hours, with tasks absolutely positioned inside. Hour grid lines are rendered as background borders.

### Files Modified
- `src/components/calendar/WeekView.tsx` — absolute positioning for tasks
- `src/components/calendar/DayView.tsx` — absolute positioning for tasks  
- `src/components/calendar/TaskBlock.tsx` — fill parent height, show time

