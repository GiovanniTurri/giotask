import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useGoogleCalendarConnections() {
  return useQuery({
    queryKey: ["google-calendar-connections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("google_calendar_connections")
        .select("*");
      if (error) throw error;
      return data;
    },
  });
}

export function useGoogleCalendarEvents(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ["google-calendar-events", startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from("google_calendar_events")
        .select("*, google_calendar_connections(google_email)")
        .order("start_time", { ascending: true });

      if (startDate) query = query.gte("start_time", startDate);
      if (endDate) query = query.lte("start_time", endDate);

      const { data, error } = await query;
      if (error) throw error;

      // Hide events that this app itself wrote as task mirrors — they would
      // otherwise show up as duplicate "Focus" blocks alongside the real task.
      const { data: mirrors } = await supabase
        .from("task_calendar_mirrors")
        .select("google_event_id");
      const mirrorIds = new Set((mirrors || []).map((m) => m.google_event_id));
      return (data || []).filter((ev) => !mirrorIds.has(ev.google_event_id));
    },
  });
}

export function useConnectGoogleCalendar() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("google-calendar-auth", {
        body: { action: "get_auth_url", origin: window.location.origin },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data.url as string;
    },
  });
}

export function useDisconnectGoogleCalendar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (connectionId: string) => {
      const { data, error } = await supabase.functions.invoke("google-calendar-auth", {
        body: { action: "disconnect", connection_id: connectionId },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["google-calendar-connections"] });
      qc.invalidateQueries({ queryKey: ["google-calendar-events"] });
    },
  });
}

export function useListGoogleCalendars() {
  return useMutation({
    mutationFn: async (connectionId: string) => {
      const { data, error } = await supabase.functions.invoke("google-calendar-auth", {
        body: { action: "list_calendars", connection_id: connectionId },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data.calendars as Array<{
        id: string;
        summary: string;
        backgroundColor: string;
        primary: boolean;
      }>;
    },
  });
}

export function useUpdateSelectedCalendars() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ connectionId, calendarIds }: { connectionId: string; calendarIds: string[] }) => {
      const { data, error } = await supabase.functions.invoke("google-calendar-auth", {
        body: { action: "update_selected_calendars", connection_id: connectionId, calendar_ids: calendarIds },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["google-calendar-connections"] }),
  });
}

export function useSyncGoogleCalendar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (connectionId?: string) => {
      const { data, error } = await supabase.functions.invoke("google-calendar-sync", {
        body: connectionId ? { connection_id: connectionId } : {},
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data as { synced: number };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["google-calendar-events"] });
      qc.invalidateQueries({ queryKey: ["google-calendar-connections"] });
    },
  });
}

export function useUpdateMirrorSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      connectionId: string;
      mirror_enabled?: boolean;
      mirror_target_calendar_id?: string;
      mirror_label?: string;
      mirror_visibility?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("google-calendar-auth", {
        body: {
          action: "update_mirror_settings",
          connection_id: params.connectionId,
          mirror_enabled: params.mirror_enabled,
          mirror_target_calendar_id: params.mirror_target_calendar_id,
          mirror_label: params.mirror_label,
          mirror_visibility: params.mirror_visibility,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["google-calendar-connections"] }),
  });
}

export function useBackfillMirror() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (connectionId: string) => {
      const { data, error } = await supabase.functions.invoke("google-calendar-mirror", {
        body: { action: "backfill", connection_id: connectionId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { upserted: number };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["google-calendar-events"] });
      qc.invalidateQueries({ queryKey: ["google-calendar-connections"] });
    },
  });
}

/** Fire-and-forget mirror trigger after a task mutation. */
export async function triggerTaskMirror(action: "upsert" | "delete", taskIds: string | string[]) {
  try {
    const ids = Array.isArray(taskIds) ? taskIds : [taskIds];
    if (ids.length === 0) return;
    await supabase.functions.invoke("google-calendar-mirror", {
      body: { action, task_ids: ids },
    });
  } catch (e) {
    console.warn("Mirror trigger failed:", e);
  }
}

