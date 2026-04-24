## Plan: Add “Couple Life” Section

### Goal

Create a dedicated **Couple Life** page that shows:

- Upcoming activities planned with your girlfriend.
- A warm visual timeline/dashboard of those activities.
- Suggestions for new couple activities based on past completed events and nearby holidays.

### How Activities Will Be Identified

To keep this simple and compatible with the current app, Couple Life will use the existing task/tag system:

- Activities will be tasks linked to a special client tag named **“Coppia”**.
- If the tag does not exist yet, it can be created manually from the existing Tags manager.
- The new page will filter tasks whose tag name matches **Couple life**.

This avoids adding a new database structure and keeps couple activities editable through the existing task dialog.

### Page Layout

Add a new route and sidebar item:

- Sidebar: **Couple Life** with a heart icon.
- Route: `/couple-life`.

The page will include:

1. **Header summary**
  - Number of upcoming couple activities.
  - Next planned activity date/time.
  - Count of completed couple activities.
2. **Upcoming activities visualization**
  - A visually distinct card/grid showing the next activities ordered by date.
  - Each card shows title, date, time, duration, status, and optional description.
  - A small “days until” label such as “in 3 days”, “tomorrow”, or “today”.
3. **Mini timeline**
  - A chronological strip/list for the next few scheduled couple activities.
  - Helps quickly see what is coming soon.
4. **Past memories / done events**
  - Show recent completed Couple Life tasks.
  - These are used as signals for suggestions.
5. **Suggestions section**
  - Generate simple suggestions from:
    - Past completed couple activities.
    - Upcoming holidays/seasonal moments.
    - General date/activity categories.
  - Suggestions will be displayed as cards with a reason, e.g.:
    - “You enjoyed dinner plans before — plan a cozy dinner around Valentine’s Day.”
    - “A weekend walk could fit near Easter/spring.”

### Holiday-Aware Suggestions

Add a lightweight local holiday helper. No external API is needed initially.

Included holiday/seasonal anchors:

- Valentine’s Day
- International Women’s Day
- Easter period / spring weekend ideas
- Anniversary-style generic suggestion if past activity titles mention “anniversary”
- Summer picnic / beach walk period
- Halloween cozy activity
- Christmas / New Year dates
- Birthday-style suggestion if past titles mention “birthday”
- 23rd and 25th April

The suggestions will prioritize holidays within the next 90 days, plus recurring ideas inferred from completed tasks.

### Create Task From Suggestion

Each suggestion card will have a **“Create task”** button that opens the existing `TaskDialog` prefilled with:

- Suggested title.
- Suggested description.
- The Couple Life tag if available.
- A suggested date when the suggestion is holiday-linked.
- Default duration, such as 90 minutes.

If the Couple Life tag is missing, the page will show a small callout telling you to create it in Tags first.

### Technical Details

Files to add/modify:

- `src/pages/CoupleLifePage.tsx` — new main page.
- `src/lib/coupleLifeSuggestions.ts` — local suggestion and holiday logic.
- `src/App.tsx` — add `/couple-life` route.
- `src/components/AppSidebar.tsx` — add Couple Life navigation item.
- `src/components/TaskDialog.tsx` — add optional initial values/prefill support so suggestions can open the existing create task modal.

Implementation notes:

- Reuse `useTasks()` and `useClientTags()`.
- No database migration is required.
- Suggestions are computed client-side from existing tasks.
- Existing task scheduling, reminders, and calendar behavior continue to work unchanged.

### Out of Scope

- Shared account access for your girlfriend.
- Automatic holiday APIs by country/region.
- AI-generated suggestions from a backend function.
- Push notifications specific to Couple Life activities.
- Separate privacy/auth model for relationship data.