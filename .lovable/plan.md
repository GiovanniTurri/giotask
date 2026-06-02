## Goal

Replace the single "Model" text field for the Local LLM provider with an **ordered list of up to 5 model names**. At runtime, the app tries model #1 first; if the request fails (network error, non-OK response, empty/invalid reply, or timeout), it automatically retries with model #2, then #3, etc., until one succeeds or the list is exhausted.

This works with LM Studio's OpenAI-compatible server because LM Studio Just-In-Time loads any installed model whose name is passed in the `model` field. If a name isn't available, LM Studio returns an error — which we detect and fall back from.

## Changes

### 1. Database (`llm_config` table)

Add a new column to store the ordered list:

```sql
ALTER TABLE public.llm_config
  ADD COLUMN local_models text[] NOT NULL DEFAULT '{}';
```

Keep the existing `local_model` column for backward compatibility (used as a fallback seed if `local_models` is empty).

### 2. Settings UI (`src/pages/SettingsPage.tsx`)

Inside the "Local LLM" card, replace the single Model input with:

- A list of **5 numbered inputs** ("Model 1 (primary)", "Model 2 (fallback)", …, "Model 5").
- Each input is plain text (e.g. `llama-3.1-8b-instruct`, `qwen2.5-7b`, …).
- Small "Up/Down" buttons (or a drag handle) next to each row to reorder.
- A short helper text explaining the fallback behavior:
  > "If the first model is unavailable in LM Studio or fails to respond, the next one in the list is tried automatically."
- Optional **"Test"** button that calls `GET {endpoint root}/models` and highlights which configured names are currently loaded/installed.
- On save, the array is written to `local_models`; empty rows are stripped.

### 3. Runtime fallback logic

Add a small shared helper `src/lib/localLlmFallback.ts` exporting:

```ts
callLocalLlmWithFallback({
  endpoint, models, buildPayload, parseResponse, timeoutMs = 90000
}): Promise<T>
```

It iterates the `models` array in order. For each model:
- Build the payload via `buildPayload(model)`.
- POST to the endpoint with an `AbortController` timeout.
- Treat as **failure → try next model** when:
  - `fetch` throws (network error, CORS, timeout/abort).
  - Response status is not OK (LM Studio returns 4xx when the model name is unknown or cannot be loaded).
  - Response body is empty, not valid JSON, or contains no usable `choices[0].message` content / tool_call.
  - `parseResponse(...)` throws (LLM produced unparseable output).
- On success, return the parsed value and remember which model worked (for a toast like "Used fallback model: qwen2.5-7b").
- If the entire list is exhausted, throw an aggregated error listing each attempt.

### 4. Wire the helper into existing hooks

- `src/hooks/useAiScheduler.ts` — rewrite `fetchLocalSchedule` to use `callLocalLlmWithFallback`, where `buildPayload(model)` produces the current two payload variants (`messages` and `fallbackSingleMessage`) for that model, and `parseResponse` extracts the schedule (tool call or JSON-in-text). Default model list = `llmConfig.local_models?.length ? llmConfig.local_models : [llmConfig.local_model || "llama3"]`.
- `src/hooks/useCoupleLifeAiSuggestions.ts` — same pattern for the local branch.

### 5. UX feedback

- Show a toast when a non-primary model was used: `"Primary model unavailable, used 'qwen2.5-7b' instead."`
- Show a clear error toast listing all failed models if every attempt fails.

## Out of scope

- No automated LM Studio "load model" REST call beyond passing the `model` field (LM Studio's JIT loading already handles this). If later you want explicit pre-loading via the LM Studio REST API (`/api/v0/models/load`), it can be added as a follow-up.
- No changes to Lovable or Cloud providers.

## Files touched

- **New migration**: add `local_models text[]` column.
- **New**: `src/lib/localLlmFallback.ts`
- **Edited**: `src/pages/SettingsPage.tsx`, `src/hooks/useAiScheduler.ts`, `src/hooks/useCoupleLifeAiSuggestions.ts`
