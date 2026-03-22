## Fix Local LLM Support

### Problem

The `schedule-tasks` edge function runs on remote servers. When configured with `http://localhost:1234/...`, it tries to reach localhost on the server, not the user's machine. Local LLMs are unreachable from edge functions.

### Solution

When the active provider is "local", make the LLM call **from the browser** instead of the edge function. Considera also the use of this software when running with "npm run dev" on the local PC.

### Changes

**1. Create a shared prompt builder utility** (`src/lib/schedulerPrompt.ts`)

- Extract the system prompt, tool definition, and task-list formatting logic from the edge function into a shared utility that both the edge function and frontend can use.

**2. Update `useAiScheduler.ts**`

- Before calling the edge function, check the `llm_config` for the active provider.
- If provider is `"local"`:
  - Fetch tasks from Supabase directly (same query the edge function uses).
  - Build the prompt and tool call payload locally.
  - Call the local LLM endpoint (`fetch` from the browser to `http://localhost:1234/v1/chat/completions`).
  - Parse the tool call response and return the schedule.
- If provider is `"lovable"` or `"cloud"`: continue using the edge function as before.

**3. Update `schedule-tasks/index.ts**`

- Remove the local LLM branch (it can never work from the server).
- Keep only lovable and cloud provider logic.

**4. Add CORS note in Settings UI**

- When "Local LLM" is selected, show a helper note: "Ensure your local LLM server has CORS enabled (LM Studio: enable it in Server settings)."

### Technical Detail

- Browser `fetch` to `localhost:1234` works because the browser runs on the user's machine.
- LM Studio requires CORS to be enabled in its server settings for browser requests to succeed.
- No database or migration changes needed.

### Files Modified

- `src/hooks/useAiScheduler.ts` — add local LLM branch
- `src/lib/schedulerPrompt.ts` — new shared prompt builder
- `supabase/functions/schedule-tasks/index.ts` — remove local branch
- `src/pages/SettingsPage.tsx` — add CORS helper note for local provider