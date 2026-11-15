const ALLOWED_ORIGINS = new Set([
  "https://giotask.lovable.app",
  "https://id-preview--fc02ce6a-0cfe-44e3-b3c0-d876a92e6fc0.lovable.app",
  "http://localhost:8080",
]);

export function allowedOAuthOrigin(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.origin === value && ALLOWED_ORIGINS.has(value) ? value : null;
  } catch {
    return null;
  }
}

export function validOAuthNonce(value: string | null): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}