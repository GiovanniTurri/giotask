import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type ClientTag = Tables<"client_tags">;

export function useClientTags() {
  return useQuery({
    queryKey: ["client_tags"],
    queryFn: async () => {
      const { data, error } = await supabase.from("client_tags").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateClientTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tag: TablesInsert<"client_tags">) => {
      const { data, error } = await supabase.from("client_tags").insert(tag).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client_tags"] }),
  });
}

export function useUpdateClientTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<"client_tags"> & { id: string }) => {
      const { data, error } = await supabase.from("client_tags").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client_tags"] }),
  });
}

export function useDeleteClientTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_tags").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client_tags"] }),
  });
}
