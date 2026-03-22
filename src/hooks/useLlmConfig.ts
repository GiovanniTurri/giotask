import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";

export type LlmConfig = Tables<"llm_config">;

export function useLlmConfig() {
  return useQuery({
    queryKey: ["llm_config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("llm_config")
        .select("*")
        .limit(1)
        .single();
      if (error && error.code === "PGRST116") {
        // No row yet — create default
        const { data: created, error: insertErr } = await supabase
          .from("llm_config")
          .insert({})
          .select()
          .single();
        if (insertErr) throw insertErr;
        return created;
      }
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateLlmConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: TablesUpdate<"llm_config"> & { id: string }) => {
      const { id, ...rest } = updates;
      const { data, error } = await supabase
        .from("llm_config")
        .update(rest)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["llm_config"] }),
  });
}
