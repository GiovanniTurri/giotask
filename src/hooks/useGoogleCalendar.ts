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
      return data;
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
