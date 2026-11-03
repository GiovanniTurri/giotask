import { describe, it, expect } from "vitest";
import { resolveMirrorTarget } from "../../supabase/functions/_shared/mirrorTarget";

const conns = [
  { id: "a", mirror_enabled: false, mirror_target_calendar_id: "primary" },
  { id: "b", mirror_enabled: true, mirror_target_calendar_id: "work@x" },
];

describe("resolveMirrorTarget", () => {
  it("uses the default calendar when task has no choice", () => {
    expect(resolveMirrorTarget(null, conns)).toEqual({ connectionId: "b", calendarId: "work@x" });
  });
  it("uses the specific calendar chosen on the task", () => {
    expect(resolveMirrorTarget("a|family@x", conns)).toEqual({ connectionId: "a", calendarId: "family@x" });
  });
  it("does not mirror when task says none", () => {
    expect(resolveMirrorTarget("none", conns)).toBeNull();
  });
  it("does not mirror when no default is set", () => {
    expect(resolveMirrorTarget(null, [conns[0]])).toBeNull();
  });
});
