import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { computeDueDate, romeNineAm } from "@/lib/peopleSchedule";

export type Person = Tables<"people">;
export type PersonChannel = Tables<"person_channels">;
export type PersonContact = Tables<"person_contacts">;
export type PersonFull = Person & { person_channels: PersonChannel[]; person_contacts: PersonContact[] };

export const CHANNEL_KINDS = [
  "instagram", "linkedin", "x", "tiktok", "facebook", "email", "phone", "whatsapp", "telegram", "other",
] as const;
export type ChannelKind = (typeof CHANNEL_KINDS)[number];

export const CHANNEL_LABELS: Record<string, string> = {
  instagram: "Instagram", linkedin: "LinkedIn", x: "X", tiktok: "TikTok", facebook: "Facebook",
  email: "Email", phone: "Phone", whatsapp: "WhatsApp", telegram: "Telegram", other: "Other",
};

export function channelHref(kind: string, value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  const handle = v.replace(/^@/, "");
  const digits = v.replace(/[^\d+]/g, "");
  switch (kind) {
    case "instagram": return `https://instagram.com/${handle}`;
    case "linkedin": return `https://linkedin.com/in/${handle}`;
    case "x": return `https://x.com/${handle}`;
    case "tiktok": return `https://tiktok.com/@${handle}`;
    case "facebook": return `https://facebook.com/${handle}`;
    case "email": return `mailto:${v}`;
    case "phone": return `tel:${digits}`;
    case "whatsapp": return `https://wa.me/${digits.replace("+", "")}`;
    case "telegram": return `https://t.me/${handle}`;
    default: return null;
  }
}

export function usePeople() {
  return useQuery({
    queryKey: ["people"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("people")
        .select("*, person_channels(*), person_contacts(*)")
        .order("name");
      if (error) throw error;
      return data as PersonFull[];
    },
  });
}

/** Replace the pending push reminder for this person (09:00 Rome on due day). */
async function syncPersonReminder(p: Person) {
  await supabase.from("reminder_queue").delete().eq("person_id", p.id).is("sent_at", null);
  const due = computeDueDate(p);
  if (!due) return;
  let fire = romeNineAm(due);
  if (fire.getTime() < Date.now()) fire = new Date(Date.now() + 60_000);
  await supabase.from("reminder_queue").insert({
    task_id: p.id,
    person_id: p.id,
    fire_at: fire.toISOString(),
    title: `👋 Reach out to ${p.name}`,
    body: "Time to get back in touch",
    tag: `person-${p.id}`,
  });
}

export interface PersonSaveInput {
  id?: string;
  name: string;
  avatar_url: string | null;
  client_tag_id: string | null;
  notes: string;
  recontact_every_days: number | null;
  next_contact_date: string | null;
  channels: { kind: string; value: string; label: string }[];
}

export function useSavePerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, channels, ...fields }: PersonSaveInput) => {
      const q = id
        ? supabase.from("people").update(fields).eq("id", id).select().single()
        : supabase.from("people").insert(fields).select().single();
      const { data, error } = await q;
      if (error) throw error;
      await supabase.from("person_channels").delete().eq("person_id", data.id);
      const rows = channels.filter((c) => c.value.trim()).map((c) => ({ ...c, person_id: data.id }));
      if (rows.length) {
        const { error: chErr } = await supabase.from("person_channels").insert(rows);
        if (chErr) throw chErr;
      }
      await syncPersonReminder(data);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["people"] }),
  });
}

export function useDeletePerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("reminder_queue").delete().eq("person_id", id).is("sent_at", null);
      const { error } = await supabase.from("people").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["people"] }),
  });
}

export function useLogContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ person, channel_kind, note }: { person: Person; channel_kind: string | null; note: string }) => {
      const now = new Date().toISOString();
      const { error } = await supabase.from("person_contacts").insert({ person_id: person.id, channel_kind, note, contacted_at: now });
      if (error) throw error;
      // A manual date is consumed once you've contacted them.
      const { data, error: upErr } = await supabase
        .from("people")
        .update({ last_contacted_at: now, next_contact_date: null })
        .eq("id", person.id).select().single();
      if (upErr) throw upErr;
      await syncPersonReminder(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["people"] }),
  });
}
