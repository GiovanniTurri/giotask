# Personalize couple suggestions + connect Obsidian

Two complementary features:

1. **Partner profile & preferences** — structured data about your girlfriend (likes, dislikes, important dates, languages she speaks, food restrictions, free notes) that gets injected into every AI couple-ideas prompt.
2. **Obsidian bridge** — read/write Markdown notes from an Obsidian vault so the LLM can use your "second brain" as extra context (and so generated couple plans can be saved back as notes).

---

## 1. Partner profile

### New table `partner_profile` (single row, like `llm_config`)

| column | type | purpose |
|---|---|---|
| `id` | uuid PK | — |
| `display_name` | text | e.g. "Giulia" — never sent to mirrored Google Calendar |
| `birthday` | date | seeds birthday/holiday anchors |
| `anniversary_date` | date | same |
| `languages` | text[] | e.g. `{it, en}` |
| `loves` | text[] | free-form likes (sushi, vinyl, hiking) |
| `dislikes` | text[] | things to avoid in suggestions |
| `food_restrictions` | text[] | allergies / diets |
| `budget_default` | text | default budget level |
| `mood_default` | text | default mood |
| `love_language` | text | acts of service / quality time / etc. |
| `notes` | text | unstructured paragraph the LLM can read freely |
| `created_at`, `updated_at` | timestamptz | — |

Permissive RLS (single-user model, like every other table).

### New page section: **Settings → Partner profile**

- Form bound to a new `usePartnerProfile()` TanStack Query hook (mirrors `useLlmConfig`).
- Tag-style inputs for the array fields, free-text for `notes`.
- Saved to Lovable Cloud, no auth.

### Wire it into AI prompts

In `src/lib/coupleLifeAiPrompt.ts` and `supabase/functions/generate-couple-ideas/index.ts`:
- Load `partner_profile` (browser hook for Local LLM, edge function for Lovable/Cloud).
- Add a `partner_profile` block to the `user` JSON message.
- Update the system prompt: "Respect partner's `dislikes` and `food_restrictions` as hard constraints. Lean into `loves` and `love_language`. Use `display_name` only inside reasons, never in task titles."

The scheduler prompt (`src/lib/schedulerPrompt.ts`) does **not** receive this — partner data only flows to couple-life suggestions.

### Privacy

- `display_name` and `notes` are kept out of the Focus mirror (that already only writes "Focus" — no change needed, just confirm in code).
- Add a one-line note in `Coder.md` and `mem://features/couple-life` (new memory file).

---

## 2. Obsidian "second brain" bridge

Obsidian stores notes as plain Markdown files in a local vault. There's no hosted API, so we offer **two integration modes** and let the user pick:

### Mode A — Manual vault folder import/export (default, zero setup)

- New page **Settings → Second brain**.
- "Import notes" button: file-picker with `webkitdirectory` to select a vault folder; we read `.md` files in the browser, send their text to a new edge function `ingest-brain-notes` which stores them in a new `brain_notes` table.
- "Export couple plan as note" button on each AI suggestion / couple task: downloads a `.md` file the user drops back into their vault.

### Mode B — Local bridge (advanced, like the Local LLM option)

- A small **Obsidian Local REST API plugin** runs in Obsidian (community plugin, exposes `http://127.0.0.1:27123` with a token).
- We add `obsidian_local_endpoint` + `obsidian_local_token` columns to a new `brain_config` table.
- Browser-side fetch (same pattern as Local LLM in `useCoupleLifeAiSuggestions`) lists/reads notes directly from the running Obsidian.
- No data ever leaves the user's machine; this matches the project's existing "Local provider" philosophy.

The user picks A or B in Settings. Both populate the same `brain_notes` cache used by the AI.

### New table `brain_notes`

| column | type | purpose |
|---|---|---|
| `id` | uuid PK | — |
| `path` | text | relative vault path, unique |
| `title` | text | first H1 or filename |
| `content` | text | markdown body (truncated to ~8 KB per note) |
| `tags` | text[] | parsed `#tag` and frontmatter tags |
| `is_partner_relevant` | bool | flagged when path/tags match `couple|partner|girlfriend|<display_name>` |
| `updated_at` | timestamptz | from file mtime |

Permissive RLS.

### Use brain notes in the AI prompt

In `generate-couple-ideas` and the local LLM path:
- Pull up to 8 most-recent `brain_notes` where `is_partner_relevant = true`, plus any whose tags include the selected mood.
- Add a `brain_context` array to the user message with `{title, excerpt}` pairs (excerpt = first 600 chars).
- System prompt addendum: "`brain_context` contains the user's personal notes. Treat them as soft hints, never quote verbatim, never invent facts not in them."

Token budget: cap total brain payload at ~6 KB to stay safe with all three providers (Lovable / Cloud / Local).

### Export back to Obsidian

- New util `exportTaskAsObsidianNote(task)` → builds Markdown with YAML frontmatter (`tags: [couple, focus]`, `date`, `duration`).
- Mode A: triggers a browser download.
- Mode B: PUTs to `/vault/{folder}/{slug}.md` on the local Obsidian endpoint.

---

## Files touched

**New**
- `supabase/migrations/<ts>_partner_profile_and_brain.sql` — `partner_profile`, `brain_notes`, `brain_config` tables + permissive RLS.
- `supabase/functions/ingest-brain-notes/index.ts` — bulk upsert handler.
- `src/hooks/usePartnerProfile.ts`
- `src/hooks/useBrainNotes.ts`
- `src/hooks/useBrainConfig.ts`
- `src/components/PartnerProfileForm.tsx`
- `src/components/SecondBrainSettings.tsx` (Mode A picker + Mode B endpoint form + import status)
- `src/lib/obsidianExport.ts`
- `mem://features/couple-life` (memory file for these rules)

**Edited**
- `src/lib/coupleLifeAiPrompt.ts` — accept `partnerProfile` and `brainContext`, add to messages + tool schema (no schema change needed; only message body).
- `src/hooks/useCoupleLifeAiSuggestions.ts` — fetch partner profile + brain notes before calling LLM.
- `supabase/functions/generate-couple-ideas/index.ts` — same fetch, server-side.
- `src/pages/SettingsPage.tsx` — two new sections.
- `Coder.md` — short paragraphs for partner profile + second-brain bridge.
- `mem://index.md` — link the new memory file.

---

## Out of scope (v1)

- No realtime two-way sync with Obsidian (Mode B is on-demand fetch only).
- No encryption-at-rest for `brain_notes` beyond Supabase defaults — call this out in the Privacy page.
- No multi-partner support (single-user app, single partner row).
- Partner profile is **not** sent to Google Calendar mirrors (already only writes "Focus").

---

## Open questions

1. For Obsidian, do you want **Mode A only** (simplest, ships today), **Mode B only** (most private, needs the Local REST API plugin), or **both** as switchable options?
2. Should brain notes be filtered to a **specific subfolder** of your vault (e.g. `Couple/`, `People/Giulia/`) instead of the whole vault, to keep the AI context focused and small?
3. Any fields you want on the partner profile that aren't listed above (e.g. clothing sizes, favorite artists, gift wishlist)?
