import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Heart, Pencil, Plus, Sparkles, Trash2, X } from "lucide-react";
import { useHolidays, useCreateHoliday, useUpdateHoliday, useDeleteHoliday, type Holiday } from "@/hooks/useHolidays";
import { toast } from "sonner";

interface HolidayManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface DraftState {
  id?: string;
  name: string;
  month: number;
  day: number;
  year: string; // empty = none
  recurring: boolean;
  kind: "holiday" | "anniversary";
  title: string;
  description: string;
}

const emptyDraft = (): DraftState => ({
  name: "",
  month: new Date().getMonth() + 1,
  day: new Date().getDate(),
  year: "",
  recurring: true,
  kind: "holiday",
  title: "",
  description: "",
});

function formatHolidayDate(h: Holiday) {
  const m = MONTH_NAMES[h.month - 1];
  return h.recurring ? `${m} ${h.day}` : `${m} ${h.day}, ${h.year}`;
}

export function HolidayManager({ open, onOpenChange }: HolidayManagerProps) {
  const { data: holidays, isLoading } = useHolidays();
  const createHoliday = useCreateHoliday();
  const updateHoliday = useUpdateHoliday();
  const deleteHoliday = useDeleteHoliday();

  const [draft, setDraft] = useState<DraftState | null>(null);

  const startNew = () => setDraft(emptyDraft());

  const startEdit = (h: Holiday) => setDraft({
    id: h.id,
    name: h.name,
    month: h.month,
    day: h.day,
    year: h.year != null ? String(h.year) : "",
    recurring: h.recurring,
    kind: (h.kind === "anniversary" ? "anniversary" : "holiday"),
    title: h.title || "",
    description: h.description || "",
  });

  const cancelEdit = () => setDraft(null);

  const saveDraft = async () => {
    if (!draft) return;
    if (!draft.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (draft.month < 1 || draft.month > 12) {
      toast.error("Month must be between 1 and 12");
      return;
    }
    if (draft.day < 1 || draft.day > 31) {
      toast.error("Day must be between 1 and 31");
      return;
    }
    if (!draft.recurring && !draft.year.trim()) {
      toast.error("Year is required for one-shot holidays");
      return;
    }

    const payload = {
      name: draft.name.trim(),
      month: draft.month,
      day: draft.day,
      year: draft.recurring ? null : Number(draft.year),
      recurring: draft.recurring,
      kind: draft.kind,
      title: draft.title.trim(),
      description: draft.description.trim(),
    };

    try {
      if (draft.id) {
        await updateHoliday.mutateAsync({ id: draft.id, ...payload });
        toast.success("Holiday updated");
      } else {
        await createHoliday.mutateAsync(payload as any);
        toast.success("Holiday added");
      }
      setDraft(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to save holiday");
    }
  };

  const handleDelete = async (h: Holiday) => {
    try {
      await deleteHoliday.mutateAsync(h.id);
      toast.success(`${h.name} removed`);
    } catch (e: any) {
      toast.error(e.message || "Failed to remove holiday");
    }
  };

  const isSaving = createHoliday.isPending || updateHoliday.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Holidays & anniversaries
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              These dates power Couple Life suggestions.
            </p>
            {!draft && (
              <Button size="sm" onClick={startNew}>
                <Plus className="h-4 w-4 mr-1" /> Add new
              </Button>
            )}
          </div>

          {draft && (
            <div className="rounded-md border border-border bg-muted/30 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{draft.id ? "Edit holiday" : "New holiday"}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={cancelEdit}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="holiday-name">Name</Label>
                  <Input
                    id="holiday-name"
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    placeholder="e.g. Our anniversary"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1.5">
                    <Label>Month</Label>
                    <Select
                      value={String(draft.month)}
                      onValueChange={(v) => setDraft({ ...draft, month: Number(v) })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MONTH_NAMES.map((name, idx) => (
                          <SelectItem key={idx + 1} value={String(idx + 1)}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Day</Label>
                    <Input
                      type="number"
                      min={1}
                      max={31}
                      value={draft.day}
                      onChange={(e) => setDraft({ ...draft, day: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Year {draft.recurring && <span className="text-xs text-muted-foreground">(n/a)</span>}</Label>
                    <Input
                      type="number"
                      placeholder="2026"
                      value={draft.year}
                      disabled={draft.recurring}
                      onChange={(e) => setDraft({ ...draft, year: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                    <Label htmlFor="recurring-toggle" className="cursor-pointer text-sm">
                      Repeats yearly
                    </Label>
                    <Switch
                      id="recurring-toggle"
                      checked={draft.recurring}
                      onCheckedChange={(v) => setDraft({ ...draft, recurring: v })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Type</Label>
                    <Select
                      value={draft.kind}
                      onValueChange={(v) => setDraft({ ...draft, kind: v as "holiday" | "anniversary" })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="holiday">Holiday</SelectItem>
                        <SelectItem value="anniversary">Anniversary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="holiday-title">Suggestion title <span className="text-xs text-muted-foreground">(optional)</span></Label>
                  <Input
                    id="holiday-title"
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    placeholder="Plan something for this date"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="holiday-desc">Suggestion description <span className="text-xs text-muted-foreground">(optional)</span></Label>
                  <Textarea
                    id="holiday-desc"
                    rows={2}
                    value={draft.description}
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                    placeholder="Short idea shown in the Couple Life suggestion."
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={cancelEdit}>Cancel</Button>
                  <Button size="sm" onClick={saveDraft} disabled={isSaving}>
                    {isSaving ? "Saving..." : draft.id ? "Update" : "Add"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <Separator />

          {isLoading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
          ) : holidays && holidays.length > 0 ? (
            <div className="space-y-2">
              {holidays.map((h) => (
                <div
                  key={h.id}
                  className="flex items-start justify-between gap-3 rounded-md border border-border p-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {h.kind === "anniversary" && <Heart className="h-3.5 w-3.5 text-destructive shrink-0" />}
                      <span className="font-medium text-sm">{h.name}</span>
                      <Badge variant="outline" className="text-[10px]">{formatHolidayDate(h)}</Badge>
                      {h.recurring && <Badge variant="secondary" className="text-[10px]">Yearly</Badge>}
                      {h.is_builtin && <Badge variant="secondary" className="text-[10px]">Built-in</Badge>}
                    </div>
                    {h.title && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{h.title}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(h)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(h)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No holidays yet. Add one to get started.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
