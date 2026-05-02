import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type BrainNote = Tables<"brain_notes">;

export function useBrainNotes() {
  return useQuery({
    queryKey: ["brain_notes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brain_notes")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });
}

export function useDeleteAllBrainNotes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("brain_notes")
        .delete()
        .gte("created_at", "1900-01-01");
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["brain_notes"] }),
  });
}
