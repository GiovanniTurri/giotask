## Recommendation

Yes — adding LLM support here would be valuable. The current Couple Life suggestions are useful but rule-based. An LLM can make them feel more personal and creative by using your past completed couple activities, upcoming dates, holidays, task preferences, and the desired mood to propose richer activity ideas.

The best approach is to add this as an optional enhancement on the existing Couple Life page, while keeping the current non-AI suggestions as the fallback.

## Plan: AI-Enhanced Couple Task Creation

### User Experience

Add an **AI creative ideas** area in the Couple Life page:

- A button such as **“Generate creative couple ideas”**.
- Optional quick controls:
  - Mood: romantic, relaxed, surprise, adventurous, cozy.
  - Budget: free/low/medium/special.
  - Timing: this week, this month, around next holiday.
- The AI returns 3–5 structured suggestions.
- Each suggestion card shows:
  - title
  - description
  - reason
  - suggested date/time if appropriate
  - duration
  - reminder suggestion
  - holiday/occasion link when relevant
- Each card keeps the existing **Create task** flow, opening `TaskDialog` prefilled with the AI idea.

### Cloud + Local Support

Reuse the existing Settings page LLM configuration:

- **Lovable AI**: default built-in option, no API key needed.
- **Cloud LLM**: use the user-configured OpenAI-compatible endpoint/model/key.
- **Local LLM**: use the user-configured local endpoint/model directly from the browser, with the same CORS constraints already documented in Settings.

This keeps behavior consistent with the existing AI scheduler.

### Data Used by the AI

The prompt will include only relevant structured context:

- Upcoming Couple Life tasks.
- Recently completed Couple Life tasks.
- Nearby holidays already supported by the local suggestion logic.
- The selected mood/budget/timing.
- Existing Couple Life tag ID for prefill behavior.

The AI should not create tasks directly. It only proposes drafts; the user reviews and clicks **Create task**.

### Fallback Behavior

If AI is unavailable or fails:

- Show a clear toast/error message.
- Keep the existing rule-based suggestions visible.
- Do not block normal task creation.

For local LLMs, if structured/tool output is unsupported, parse a plain JSON response similarly to the existing local scheduler fallback.

### Technical Details

Files to add/modify:

- `src/lib/coupleLifeAiPrompt.ts` — build provider-neutral prompts and parse/validate AI suggestion output.
- `src/hooks/useCoupleLifeAiSuggestions.ts` — generate suggestions using the active provider.
- `supabase/functions/generate-couple-ideas/index.ts` — backend function for Lovable AI and Cloud LLM providers.
- `src/pages/CoupleLifePage.tsx` — add AI generation UI, loading states, and AI suggestion cards.
- Optionally `src/lib/llmUtils.ts` — share local endpoint normalization/parsing currently duplicated in scheduler logic.

Flow:

```text
Couple Life page
  -> User chooses mood/budget/timing
  -> Generate ideas
      -> Lovable AI / Cloud: backend function
      -> Local: browser request to local endpoint
  -> Validate structured suggestions
  -> Show suggestion cards
  -> Create task opens TaskDialog with prefilled values
```

### Output Shape

The AI response should be constrained to structured suggestions like:

```text
[
  {
    title,
    description,
    reason,
    suggested_date,
    scheduled_start_time,
    duration_minutes,
    reminder_minutes,
    occasion
  }
]
```

For providers that support tool/function calling, use structured output. For local models without tool support, request strict JSON and parse defensively.

### Safety and Privacy

- Do not auto-create tasks from AI output.
- Do not send unrelated tasks; only Couple Life task summaries are used.
- Do not store generated suggestions unless the user creates a task.
- Keep API keys on the backend for cloud providers; local LLM calls remain browser-local as currently implemented.

### Out of Scope

- Fully autonomous date planning without review.
- External booking, maps, restaurants, tickets, or reservations.
- Sharing the section with your girlfriend.
- Country-specific public holiday APIs.
- Long-term AI memory beyond existing completed tasks.