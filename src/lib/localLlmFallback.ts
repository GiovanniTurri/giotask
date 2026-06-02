/**
 * Try a sequence of local LLM model names in order. The first one that returns
 * a usable response wins; otherwise we fall back to the next model in the list.
 *
 * A model attempt is considered FAILED (and triggers a fallback) when:
 *   - fetch throws (network error, CORS, abort/timeout)
 *   - the HTTP response is not OK (LM Studio returns 4xx when the model name
 *     is unknown or cannot be JIT-loaded)
 *   - the response body cannot be parsed as JSON
 *   - parseResponse(...) throws (output unusable / unparseable)
 */
export interface CallLocalLlmOptions<T> {
  endpoint: string;
  models: string[];
  buildPayloads: (model: string) => Record<string, unknown>[];
  parseResponse: (json: any) => T;
  timeoutMs?: number;
}

export interface CallLocalLlmResult<T> {
  data: T;
  modelUsed: string;
  attempts: { model: string; error: string }[];
}

export async function callLocalLlmWithFallback<T>(
  opts: CallLocalLlmOptions<T>,
): Promise<CallLocalLlmResult<T>> {
  const { endpoint, models, buildPayloads, parseResponse, timeoutMs = 90_000 } = opts;
  const cleanModels = (models || []).map((m) => m?.trim()).filter(Boolean) as string[];
  if (cleanModels.length === 0) throw new Error("No local LLM models configured");

  const attempts: { model: string; error: string }[] = [];

  for (const model of cleanModels) {
    const payloads = buildPayloads(model);
    let lastErr = "";
    let succeeded: T | null = null;

    for (const payload of payloads) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: ctrl.signal,
        });
        if (!res.ok) {
          lastErr = `HTTP ${res.status}: ${(await res.text()).slice(0, 240)}`;
          // Only try next payload variant if the error is shape-related
          if (!/messages|content|role|tool|function|schema|response_format/i.test(lastErr)) break;
          continue;
        }
        const json = await res.json();
        succeeded = parseResponse(json);
        break;
      } catch (e: any) {
        lastErr = e?.name === "AbortError" ? `timeout after ${timeoutMs}ms` : (e?.message || String(e));
        // Network/timeout errors are not payload-shape issues — stop retrying variants and fall back model
        break;
      } finally {
        clearTimeout(timer);
      }
    }

    if (succeeded !== null) {
      return { data: succeeded, modelUsed: model, attempts };
    }
    attempts.push({ model, error: lastErr || "unknown error" });
  }

  const summary = attempts.map((a) => `• ${a.model}: ${a.error}`).join("\n");
  throw new Error(`All local models failed:\n${summary}`);
}

/** Resolve the ordered list of model names from llm_config, with legacy fallback. */
export function resolveLocalModels(cfg: { local_models?: string[] | null; local_model?: string | null } | undefined | null): string[] {
  const list = (cfg?.local_models || []).map((m) => (m || "").trim()).filter(Boolean);
  if (list.length) return list;
  const legacy = (cfg?.local_model || "").trim();
  return legacy ? [legacy] : ["llama3"];
}
