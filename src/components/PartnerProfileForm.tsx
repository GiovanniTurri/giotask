import { useEffect, useState } from "react";
import { Heart, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePartnerProfile, useUpdatePartnerProfile, type PartnerProfile } from "@/hooks/usePartnerProfile";

type FormState = {
  display_name: string;
  birthday: string;
  anniversary_date: string;
  languages: string;
  loves: string;
  dislikes: string;
  food_restrictions: string;
  budget_default: string;
  mood_default: string;
  love_language: string;
  gift_wishlist: string;
  favorite_places: string;
  clothing_sizes: string;
  favorite_brands_artists: string;
  notes: string;
};

const splitList = (raw: string) =>
  raw.split(",").map((s) => s.trim()).filter(Boolean);

const joinList = (arr: string[] | null | undefined) => (arr || []).join(", ");

function fromProfile(p: PartnerProfile): FormState {
  return {
    display_name: p.display_name || "",
    birthday: p.birthday || "",
    anniversary_date: p.anniversary_date || "",
    languages: joinList(p.languages),
    loves: joinList(p.loves),
    dislikes: joinList(p.dislikes),
    food_restrictions: joinList(p.food_restrictions),
    budget_default: p.budget_default || "low",
    mood_default: p.mood_default || "romantic",
    love_language: p.love_language || "",
    gift_wishlist: joinList(p.gift_wishlist),
    favorite_places: joinList(p.favorite_places),
    clothing_sizes: p.clothing_sizes || "",
    favorite_brands_artists: joinList(p.favorite_brands_artists),
    notes: p.notes || "",
  };
}

export function PartnerProfileForm() {
  const { data: profile, isLoading } = usePartnerProfile();
  const update = useUpdatePartnerProfile();
  const [form, setForm] = useState<FormState | null>(null);

  useEffect(() => {
    if (profile) setForm(fromProfile(profile));
  }, [profile]);

  if (isLoading || !form || !profile) {
    return (
      <Card className="p-5 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((p) => (p ? { ...p, [key]: value } : p));

  const save = async () => {
    try {
      await update.mutateAsync({
        id: profile.id,
        display_name: form.display_name,
        birthday: form.birthday || null,
        anniversary_date: form.anniversary_date || null,
        languages: splitList(form.languages),
        loves: splitList(form.loves),
        dislikes: splitList(form.dislikes),
        food_restrictions: splitList(form.food_restrictions),
        budget_default: form.budget_default,
        mood_default: form.mood_default,
        love_language: form.love_language,
        gift_wishlist: splitList(form.gift_wishlist),
        favorite_places: splitList(form.favorite_places),
        clothing_sizes: form.clothing_sizes,
        favorite_brands_artists: splitList(form.favorite_brands_artists),
        notes: form.notes,
      });
      toast.success("Partner profile saved");
    } catch (e: any) {
      toast.error(e.message || "Failed to save partner profile");
    }
  };

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Heart className="h-4 w-4 text-couple fill-current" />
        <Label className="text-sm font-semibold">Partner profile</Label>
      </div>
      <p className="text-xs text-muted-foreground -mt-1">
        Used only by Couple Life AI suggestions. Never shared with Google Calendar mirrors.
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label className="text-xs text-muted-foreground">Display name</Label>
          <Input value={form.display_name} onChange={(e) => set("display_name", e.target.value)} placeholder="e.g. Giulia" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Love language</Label>
          <Input value={form.love_language} onChange={(e) => set("love_language", e.target.value)} placeholder="quality time, gifts, words..." />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Birthday</Label>
          <Input type="date" value={form.birthday} onChange={(e) => set("birthday", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Anniversary</Label>
          <Input type="date" value={form.anniversary_date} onChange={(e) => set("anniversary_date", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Default mood</Label>
          <Select value={form.mood_default} onValueChange={(v) => set("mood_default", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="romantic">Romantic</SelectItem>
              <SelectItem value="relaxed">Relaxed</SelectItem>
              <SelectItem value="surprise">Surprise</SelectItem>
              <SelectItem value="adventurous">Adventurous</SelectItem>
              <SelectItem value="cozy">Cozy</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Default budget</Label>
          <Select value={form.budget_default} onValueChange={(v) => set("budget_default", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="special">Special</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        <CommaField label="Languages" value={form.languages} placeholder="it, en" onChange={(v) => set("languages", v)} />
        <CommaField label="Loves" value={form.loves} placeholder="sushi, vinyl records, hiking" onChange={(v) => set("loves", v)} />
        <CommaField label="Dislikes (avoid)" value={form.dislikes} placeholder="loud bars, horror films" onChange={(v) => set("dislikes", v)} />
        <CommaField label="Food restrictions / allergies" value={form.food_restrictions} placeholder="lactose, peanuts" onChange={(v) => set("food_restrictions", v)} />
        <CommaField label="Gift wishlist" value={form.gift_wishlist} placeholder="ceramic mug, perfume sample" onChange={(v) => set("gift_wishlist", v)} />
        <CommaField label="Favorite places" value={form.favorite_places} placeholder="that ramen spot, Lake Como" onChange={(v) => set("favorite_places", v)} />
        <CommaField label="Favorite brands / artists" value={form.favorite_brands_artists} placeholder="Aesop, Phoebe Bridgers" onChange={(v) => set("favorite_brands_artists", v)} />
        <div>
          <Label className="text-xs text-muted-foreground">Clothing sizes</Label>
          <Input value={form.clothing_sizes} onChange={(e) => set("clothing_sizes", e.target.value)} placeholder="top S, shoes 38, ring 14" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Free notes</Label>
          <Textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Anything else useful for AI suggestions — context, recurring rituals, things to remember..."
            rows={4}
          />
        </div>
      </div>

      <Button onClick={save} disabled={update.isPending} size="sm">
        {update.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
        Save partner profile
      </Button>
    </Card>
  );
}

function CommaField({ label, value, placeholder, onChange }: { label: string; value: string; placeholder?: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label} <span className="text-[10px] opacity-60">(comma-separated)</span></Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
