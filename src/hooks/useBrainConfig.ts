import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";

export type BrainConfig = Tables<"brain_config">;

export function useBrainConfig() {
  return useQuery({
    queryKey: ["brain_config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brain_config")
        .select("*")
        .limit(1)
        .single();
      if (error && error.code === "PGRST116") {
        const { data: created, error: insertErr } = await supabase
          .from("brain_config")
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

export function useUpdateBrainConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: TablesUpdate<"brain_config"> & { id: string }) => {
      const { id, ...rest } = updates;
      const { data, error } = await supabase
        .from("brain_config")
        .update(rest)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["brain_config"] }),
  });
}
