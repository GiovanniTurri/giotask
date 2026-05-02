
# Create Coder.md — Architecture Guide for AI Assistants

A single root-level markdown file (`Coder.md`) summarizing how this project is structured and the rules to follow. It's written so a fresh assistant (Claude Code, Cursor, etc.) can land in the repo and produce changes that match existing conventions.

## What it covers (15 sections)

1. **What this app is** — single-user task manager, no auth, owner Giovanni Turri.
2. **Tech stack** — Vite/React 18/TS, Tailwind v3 + shadcn, TanStack Query v5, Supabase (Edge Functions + pg_cron), Web Push, Vitest/Playwright. Notes that `src/integrations/supabase/{client,types}.ts` and `.env` are auto-generated and off-limits.
3. **Routing & shell** — `/magic` outside the shell, everything else under `AppShell` with `<RemindersMount />` and `<AppSidebar />`.
4. **Folder layout** — annotated tree of `src/`, `supabase/functions/`, `public/`, `mem://`.
5. **Database schema** — every table with its purpose, the permissive RLS policy convention (and why the linter warnings are accepted), schema-change rules (migrations vs data inserts, no CHECK with `now()`, never touch reserved schemas).
6. **Edge functions** — boilerplate (CORS, OPTIONS, error CORS), one-file rule, no imports from `src/`, validation requirements, plus a function-by-function map of all 9 functions.
7. **AI scheduling flow** — fetch via edge or local browser call → preview → user approval → batch update + mirror.
8. **Google Calendar integration** — read sync + the new write-back "Focus" mirroring (settings, `task_calendar_mirrors`, triggers, filtering, v1 limits).
9. **State conventions** — all server I/O goes through TanStack Query hooks, query-key list, Sonner for toasts.
10. **UI / design system** — dark mode default, Space Grotesk + Inter, HSL tokens only, never hard-code colors, shadcn primitives untouched.
11. **Calendar layout math** — 60px-per-hour scale, absolute positioning rules, what to update in lockstep.
12. **Project memory (`mem://`)** — list of files and when to save/use them.
13. **Hard rules (do / don't)** — auth, file edits, raw SQL, color tokens, "speak in Lovable Cloud" guidance.
14. **Adding a feature — checklist** — six-step path from memory → migration → edge function → hook → UI → route.
15. **Common pitfalls** observed in this codebase (mirror filter, local LLM JSON parsing, time-zone handling, missing granted_scopes, Lovable AI 402/429).

## File location

`Coder.md` at the project root, alongside `README.md`. Length ~ 9–10K characters.

## Implementation

The complete content is already drafted (above in this conversation). On approval, I'll write it verbatim to `Coder.md` — no other files will change.
