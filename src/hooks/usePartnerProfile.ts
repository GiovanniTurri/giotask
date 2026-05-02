import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";

export type PartnerProfile = Tables<"partner_profile">;

export function usePartnerProfile() {
  return useQuery({
    queryKey: ["partner_profile"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_profile")
        .select("*")
        .limit(1)
        .single();
      if (error && error.code === "PGRST116") {
        const { data: created, error: insertErr } = await supabase
          .from("partner_profile")
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

export function useUpdatePartnerProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: TablesUpdate<"partner_profile"> & { id: string }) => {
      const { id, ...rest } = updates;
      const { data, error } = await supabase
        .from("partner_profile")
        .update(rest)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["partner_profile"] }),
  });
}
