import { describe, it, expect } from "vitest";
import { computeDueDate, daysUntil, romeNineAm } from "@/lib/peopleSchedule";

describe("people recontact schedule", () => {
  it("manual date takes precedence over every-X-days", () => {
    expect(computeDueDate({ next_contact_date: "2026-12-01", last_contacted_at: "2026-10-01T10:00:00Z", recontact_every_days: 30 })).toBe("2026-12-01");
  });
  it("every 30 days from last contact", () => {
    expect(computeDueDate({ next_contact_date: null, last_contacted_at: "2026-10-01T10:00:00Z", recontact_every_days: 30 })).toBe("2026-10-31");
  });
  it("no rule means no due date", () => {
    expect(computeDueDate({ next_contact_date: null, last_contacted_at: "2026-10-01T10:00:00Z", recontact_every_days: null })).toBeNull();
  });
  it("overdue is negative", () => {
    expect(daysUntil("2026-10-25", "2026-10-27")).toBe(-2);
  });
  it("09:00 Rome respects DST", () => {
    expect(romeNineAm("2026-07-15").toISOString()).toBe("2026-07-15T07:00:00.000Z");
    expect(romeNineAm("2026-12-15").toISOString()).toBe("2026-12-15T08:00:00.000Z");
  });
});
