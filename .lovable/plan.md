

## Fix Local LLM Scheduling (LM Studio Compatibility)

### Root Cause

The error `'messages' field is required` from LM Studio happens because many local models (including Gemma) don't support the OpenAI `tools`/`tool_choice` fields. When LM Studio receives these unsupported fields, it fails to parse the request body entirely, resulting in it not seeing the `messages` field at all.

### Solution

For local LLMs, **drop tool calling entirely** and instead ask the model to return raw JSON in its text response. Then parse the JSON from the response content. This is universally compatible with all local models.

For cloud models, tool calling works fine with OpenAI/compatible APIs — no changes needed there.

### Changes

**1. `src/hooks/useAiScheduler.ts`** — Rewrite `fetchLocalSchedule`
- Remove `tools` and `tool_choice` from the request body for local LLM calls
- Modify the system prompt to instruct the model to return a JSON array directly in its response text (no tool calling)
- Parse the schedule from the response's `message.content` instead of `tool_calls`
- Add a JSON extraction helper that finds JSON in the response text (models often wrap JSON in markdown code blocks)
- Add a fallback: if no `message.content`, still try `tool_calls` for local servers that do support it

**2. `src/lib/schedulerPrompt.ts`** — Add a local-specific prompt builder
- Create `buildLocalSystemPrompt(today)` that asks the model to return a raw JSON array in its response (no tool call references)
- Keep the existing `buildSystemPrompt` and `schedulerToolDef` unchanged for cloud/lovable providers

**3. `supabase/functions/schedule-tasks/index.ts`** — No changes needed
- Cloud and Lovable providers already work correctly with tool calling

### Files Modified
- `src/hooks/useAiScheduler.ts` — local LLM: no tools, parse JSON from text
- `src/lib/schedulerPrompt.ts` — add `buildLocalSystemPrompt()`

