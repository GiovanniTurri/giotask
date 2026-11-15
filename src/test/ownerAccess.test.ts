import { describe, expect, it, vi } from "vitest";
import { ownerAccessStatus } from "../../supabase/functions/_shared/ownerAccess";
import { allowedOAuthOrigin, validOAuthNonce } from "../../supabase/functions/_shared/oauthState";
import { inReminderDeliveryWindow } from "../../supabase/functions/_shared/reminderWindow";

describe("owner-only private actions", () => {
  it("rejects unsigned requests", async () => {
    expect(await ownerAccessStatus(null, async () => true)).toBe(401);
  });
  it("rejects an invalid session", async () => {
    expect(await ownerAccessStatus("Bearer invalid", async () => { throw new Error("invalid"); })).toBe(401);
  });
  it("rejects a signed-in non-owner", async () => {
    expect(await ownerAccessStatus("Bearer other-user", async () => false)).toBe(403);
  });
  it("allows a verified owner", async () => {
    expect(await ownerAccessStatus("Bearer owner-session", async () => true)).toBe(200);
  });
  it("allows an internal credential only when explicitly supplied by the server", async () => {
    const validate = vi.fn(async () => false);
    expect(await ownerAccessStatus("Bearer test-internal", validate)).toBe(403);
    expect(await ownerAccessStatus("Bearer test-internal", validate, ["test-internal"])).toBe(200);
    expect(validate).toHaveBeenCalledTimes(1);
  });
  it("does not accept missing or malformed internal credentials", async () => {
    expect(await ownerAccessStatus("Bearer undefined", async () => false, [undefined])).toBe(403);
    expect(await ownerAccessStatus("Bearer test-internal,other", async () => true, ["test-internal"])).toBe(401);
  });
});

describe("Google connection callback protection", () => {
  it("allows only registered return origins", () => {
    expect(allowedOAuthOrigin("https://giotask.lovable.app")).toBe("https://giotask.lovable.app");
    expect(allowedOAuthOrigin("https://attacker.example")).toBeNull();
    expect(allowedOAuthOrigin('https://giotask.lovable.app/\"<script>')).toBeNull();
  });
  it("requires an opaque callback nonce rather than trusting the supplied origin", () => {
    expect(validOAuthNonce("https://giotask.lovable.app")).toBe(false);
    expect(validOAuthNonce("2841e445-a783-4333-9d47-3dd5aa01c34c")).toBe(true);
  });
});

it("keeps scheduled reminders in the 08:00–19:00 Rome delivery window across DST", () => {
  expect(inReminderDeliveryWindow(new Date("2026-11-13T06:30:00Z"))).toBe(false);
  expect(inReminderDeliveryWindow(new Date("2026-11-13T07:00:00Z"))).toBe(true);
  expect(inReminderDeliveryWindow(new Date("2026-07-13T06:00:00Z"))).toBe(true);
  expect(inReminderDeliveryWindow(new Date("2026-11-13T19:00:00Z"))).toBe(false);
});