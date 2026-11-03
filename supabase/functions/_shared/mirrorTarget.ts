// Decides which single Google calendar a task is mirrored to.
export interface MirrorConn {
  id: string;
  mirror_enabled: boolean;
  mirror_target_calendar_id: string | null;
}

export interface MirrorTarget {
  connectionId: string;
  calendarId: string;
}

/**
 * - "none"                    -> not mirrored
 * - "connId|calId"            -> that calendar (if connection still exists)
 * - null/empty                -> the default: first connection with mirror_enabled
 */
export function resolveMirrorTarget(
  taskTarget: string | null | undefined,
  conns: MirrorConn[]
): MirrorTarget | null {
  if (taskTarget === "none") return null;
  if (taskTarget && taskTarget.includes("|")) {
    const idx = taskTarget.indexOf("|");
    const connectionId = taskTarget.slice(0, idx);
    const calendarId = taskTarget.slice(idx + 1);
    if (conns.some((c) => c.id === connectionId) && calendarId) {
      return { connectionId, calendarId };
    }
  }
  const def = conns.find((c) => c.mirror_enabled);
  if (!def) return null;
  return { connectionId: def.id, calendarId: def.mirror_target_calendar_id || "primary" };
}
