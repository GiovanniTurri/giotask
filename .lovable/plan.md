## Make the Holidays List Editable

Currently the "holidays" used to power Couple Life suggestions live in a hardcoded array inside `src/lib/coupleLifeSuggestions.ts` (Valentine's Day, Easter, Christmas, etc.). We'll move them into the database so you can add, edit, and remove them — including custom anniversaries — from a new management UI.

### Database

Create a new table `holidays` to store both built-in seeds and user additions:

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `name` | text not null | e.g. "Valentine's Day", "Our anniversary" |
| `month` | int not null | 1–12 |
| `day` | int not null | 1–31 |
| `recurring` | bool default true | Yearly repeat (off = one-shot, uses `year`) |
| `year` | int nullable | Only used when `recurring = false` |
| `kind` | text default 'holiday' | `'holiday'` or `'anniversary'` (drives icon/label) |
| `title` | text | Suggestion title shown in Couple Life |
| `description` | text | Suggestion body |
| `is_builtin` | bool default false | Marks seeded rows |
| `created_at` / `updated_at` | timestamptz | |

- Validation trigger to enforce `month 1-12`, `day 1-31`, and `year` present when `recurring = false`.
- RLS: permissive `ALL` policy (matches the project's existing pattern — there is no auth scoping).
- Seed migration inserts the existing hardcoded holidays with `is_builtin = true`. Easter is computed yearly in code (date varies), so we store it with a sentinel `kind = 'easter'` and skip month/day validation by storing `month=1, day=1` as placeholders — easier alternative: store Easter as a regular row using its 2026 date and let the user edit it. **We'll go with the simpler approach: drop the auto-Easter calculation and seed it as a regular editable row** so the holidays table has uniform semantics.

### Code changes

**`src/hooks/useHolidays.ts`** (new)
- `useHolidays()` — list, ordered by next-upcoming occurrence.
- `useCreateHoliday()`, `useUpdateHoliday()`, `useDeleteHoliday()`.

**`src/lib/coupleLifeSuggestions.ts`**
- Remove the hardcoded array and `easterDate` helper.
- Export a new pure function `buildHolidayAnchors(holidays, today)` that turns DB rows into the same `{ name, date, title, description }` shape, computing the next future occurrence (this year or next) for recurring rows.
- Update `buildCoupleLifeSuggestions(tasks, holidays)` to accept the holidays list as a parameter.

**`src/pages/CoupleLifePage.tsx`**
- Call `useHolidays()` and pass the data into `buildCoupleLifeSuggestions`.
- Add a "Manage holidays" button (e.g. next to the suggestions header) that opens the new dialog.

**`src/components/HolidayManager.tsx`** (new)
- Dialog with a list of holidays (name, date, recurring/anniversary badge, edit/delete buttons).
- "Add holiday" form: name, month/day pickers (or a date input for one-shot), recurring toggle, kind (holiday/anniversary), optional title + description (auto-filled with sensible defaults like `"Plan something for {name}"` if left blank).
- Built-in rows are editable and deletable like any other — the `is_builtin` flag is informational only (small badge).

### Out of scope

- Sharing the holiday list across users (no auth scoping today, so the table is global, matching the rest of the app).
- Importing holidays from a public calendar API.
- Localization of holiday names.
