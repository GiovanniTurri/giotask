import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useUserSettings() {
  return useQuery({
    queryKey: ["user_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateUserSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: { id: string; default_reminder_minutes?: number; notifications_enabled?: boolean }) => {
      const { id, ...updates } = patch;
      const { data, error } = await supabase
        .from("user_settings")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user_settings"] }),
  });
}
