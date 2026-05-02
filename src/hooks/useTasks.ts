import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { triggerTaskMirror } from "@/hooks/useGoogleCalendar";

export type Task = Tables<"tasks">;
export type TaskInsert = TablesInsert<"tasks">;
export type TaskUpdate = TablesUpdate<"tasks">;

export function useTasks(filters?: { status?: string; client_tag_id?: string }) {
  return useQuery({
    queryKey: ["tasks", filters],
    queryFn: async () => {
      let query = supabase
        .from("tasks")
        .select("*, client_tags(*)")
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });

      if (filters?.status) query = query.eq("status", filters.status);
      if (filters?.client_tag_id) query = query.eq("client_tag_id", filters.client_tag_id);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (task: TaskInsert) => {
      const { data, error } = await supabase.from("tasks").insert(task).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      if (data?.id) void triggerTaskMirror("upsert", data.id);
    },
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TaskUpdate & { id: string }) => {
      const { data, error } = await supabase.from("tasks").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      if (data?.id) void triggerTaskMirror("upsert", data.id);
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: snapshot, error: fetchError } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (fetchError) throw fetchError;

      // Trigger Google Calendar mirror cleanup BEFORE deletion (so the function
      // can still look up the mirror row, though it stores its own ids).
      void triggerTaskMirror("delete", id);

      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
      return snapshot as Task | null;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useRestoreTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (snapshot: Task) => {
      // Strip joined relations (e.g. client_tags) if present
      const { client_tags: _ct, ...row } = snapshot as any;
      const { data, error } = await supabase.from("tasks").insert(row).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      if (data?.id) void triggerTaskMirror("upsert", data.id);
    },
  });
}
