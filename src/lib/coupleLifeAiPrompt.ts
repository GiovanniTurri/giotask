export type CoupleLifeAiMood = "romantic" | "relaxed" | "surprise" | "adventurous" | "cozy";
export type CoupleLifeAiBudget = "free" | "low" | "medium" | "special";
export type CoupleLifeAiTiming = "week" | "month" | "holiday";

export interface CoupleLifeAiOptions {
  mood: CoupleLifeAiMood;
  budget: CoupleLifeAiBudget;
  timing: CoupleLifeAiTiming;
}

export interface CoupleLifeAiTaskContext {
  title: string;
  description: string | null;
  status: string;
  scheduled_date: string | null;
  scheduled_start_time: string | null;
  time_estimate: number;
}

export interface CoupleLifeAiSuggestion {
  id: string;
  title: string;
  description: string;
  reason: string;
  suggested_date: string | null;
  scheduled_start_time: string | null;
  duration_minutes: number;
  reminder_minutes: number | null;
  occasion: string | null;
}

const LOCAL_LLM_DEFAULT_ENDPOINT = "http://localhost:1234/v1/chat/completions";

export function normalizeLlmEndpoint(endpoint?: string | null) {
  const trimmed = endpoint?.trim();
  if (!trimmed) return LOCAL_LLM_DEFAULT_ENDPOINT;
  if (/\/v1\/chat\/completions\/?$/i.test(trimmed)) return trimmed;
  if (/\/v1\/?$/i.test(trimmed)) return `${trimmed.replace(/\/$/, "")}/chat/completions`;
  if (/^https?:\/\/[^/]+(?::\d+)?\/?$/i.test(trimmed)) return `${trimmed.replace(/\/$/, "")}/v1/chat/completions`;
  return trimmed;
}

export interface PartnerProfileContext {
  display_name?: string | null;
  birthday?: string | null;
  anniversary_date?: string | null;
  languages?: string[] | null;
  loves?: string[] | null;
  dislikes?: string[] | null;
  food_restrictions?: string[] | null;
  budget_default?: string | null;
  mood_default?: string | null;
  love_language?: string | null;
  gift_wishlist?: string[] | null;
  favorite_places?: string[] | null;
  clothing_sizes?: string | null;
  favorite_brands_artists?: string[] | null;
  notes?: string | null;
}

export interface BrainNoteContext {
  title: string;
  excerpt: string;
  tags?: string[];
}

const MAX_BRAIN_PAYLOAD = 6000;

function trimBrainContext(notes: BrainNoteContext[]): BrainNoteContext[] {
  const out: BrainNoteContext[] = [];
  let total = 0;
  for (const note of notes) {
    const excerpt = (note.excerpt || "").slice(0, 600);
    const size = excerpt.length + (note.title?.length || 0);
    if (total + size > MAX_BRAIN_PAYLOAD) break;
    out.push({ title: note.title.slice(0, 120), excerpt, tags: note.tags?.slice(0, 8) });
    total += size;
    if (out.length >= 8) break;
  }
  return out;
}

export function buildCoupleLifeAiMessages(
  tasks: CoupleLifeAiTaskContext[],
  options: CoupleLifeAiOptions,
  partner?: PartnerProfileContext | null,
  brain?: BrainNoteContext[] | null,
) {
  const today = new Date().toISOString().slice(0, 10);
  const compactTasks = tasks.slice(0, 30).map((task) => ({
    title: task.title,
    description: task.description || "",
    status: task.status,
    scheduled_date: task.scheduled_date,
    scheduled_start_time: task.scheduled_start_time,
    time_estimate: task.time_estimate,
  }));

  const partnerBlock = partner && Object.values(partner).some((v) => Array.isArray(v) ? v.length : !!v)
    ? partner
    : null;

  const brainBlock = brain && brain.length ? trimBrainContext(brain) : null;

  const system = `You are a tasteful date-planning assistant. Today is ${today}.
Create creative but practical couple activity task drafts for the user and his partner.
Use past completed activities as inspiration, avoid repeating the exact same wording, and consider nearby common holidays or seasonal moments when relevant.
Respect the selected mood, budget, and timing.
${partnerBlock ? `Partner profile is provided as 'partner_profile'. Treat 'dislikes' and 'food_restrictions' as HARD constraints (never suggest them). Lean into 'loves', 'love_language', 'favorite_places', 'favorite_brands_artists', and 'gift_wishlist' when relevant. Use 'display_name' only inside the 'reason' field, never inside task titles.` : ""}
${brainBlock ? `'brain_context' contains the user's personal Markdown notes (their second brain). Treat them as soft hints, never quote verbatim, never invent facts not present in them.` : ""}
Return 3 to 5 suggestions.
Do not book anything, do not claim external availability, and do not create tasks directly.
If tool calling is unavailable, return ONLY valid JSON with a top-level suggestions array.`;

  const userPayload: Record<string, unknown> = {
    preferences: options,
    couple_life_tasks: compactTasks,
    output_contract: {
      suggestions: [
        {
          title: "short task title (no partner name)",
          description: "specific activity details",
          reason: "why this fits based on history, mood, timing, holiday, or partner profile",
          suggested_date: "YYYY-MM-DD or null",
          scheduled_start_time: "HH:MM:SS or null",
          duration_minutes: "number between 45 and 240",
          reminder_minutes: "number or null",
          occasion: "holiday/season/pattern name or null",
        },
      ],
    },
  };
  if (partnerBlock) userPayload.partner_profile = partnerBlock;
  if (brainBlock) userPayload.brain_context = brainBlock;

  const user = JSON.stringify(userPayload, null, 2);

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

export const coupleLifeIdeasTool = {
  type: "function" as const,
  function: {
    name: "suggest_couple_ideas",
    description: "Return creative couple activity task drafts.",
    parameters: {
      type: "object",
      properties: {
        suggestions: {
          type: "array",
          minItems: 3,
          maxItems: 5,
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              reason: { type: "string" },
              suggested_date: { type: ["string", "null"], description: "YYYY-MM-DD or null" },
              scheduled_start_time: { type: ["string", "null"], description: "HH:MM:SS or null" },
              duration_minutes: { type: "number" },
              reminder_minutes: { type: ["number", "null"] },
              occasion: { type: ["string", "null"] },
            },
            required: ["title", "description", "reason", "suggested_date", "scheduled_start_time", "duration_minutes", "reminder_minutes", "occasion"],
          },
        },
      },
      required: ["suggestions"],
    },
  },
};

function extractJsonPayload(text: string) {
  let cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const firstArray = cleaned.indexOf("[");
  const firstObject = cleaned.indexOf("{");
  const useArray = firstArray !== -1 && (firstObject === -1 || firstArray < firstObject);
  const start = useArray ? firstArray : firstObject;
  const end = useArray ? cleaned.lastIndexOf("]") : cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON found in AI response");
  cleaned = cleaned.slice(start, end + 1);
  return JSON.parse(cleaned.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]").replace(/[\x00-\x1F\x7F]/g, ""));
}

function normalizeSuggestion(raw: any, index: number): CoupleLifeAiSuggestion | null {
  if (!raw?.title || !raw?.description || !raw?.reason) return null;
  return {
    id: `ai-${index}-${String(raw.title).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}`,
    title: String(raw.title).slice(0, 120),
    description: String(raw.description).slice(0, 700),
    reason: String(raw.reason).slice(0, 280),
    suggested_date: typeof raw.suggested_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.suggested_date) ? raw.suggested_date : null,
    scheduled_start_time: typeof raw.scheduled_start_time === "string" ? raw.scheduled_start_time.slice(0, 8) : null,
    duration_minutes: Math.min(240, Math.max(45, Number(raw.duration_minutes) || 90)),
    reminder_minutes: raw.reminder_minutes == null ? null : Math.max(0, Number(raw.reminder_minutes) || 10),
    occasion: raw.occasion ? String(raw.occasion).slice(0, 80) : null,
  };
}

export function parseCoupleLifeAiSuggestions(payload: unknown): CoupleLifeAiSuggestion[] {
  const parsed = typeof payload === "string" ? extractJsonPayload(payload) : payload;
  const suggestions = Array.isArray(parsed) ? parsed : (parsed as any)?.suggestions;
  if (!Array.isArray(suggestions)) throw new Error("AI response did not include suggestions");
  return suggestions.map(normalizeSuggestion).filter(Boolean).slice(0, 5) as CoupleLifeAiSuggestion[];
}

export function extractAssistantText(content: unknown) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.map((part) => typeof part === "string" ? part : typeof part?.text === "string" ? part.text : "").join("\n").trim();
}