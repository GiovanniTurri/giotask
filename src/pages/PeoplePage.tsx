import { useMemo, useState } from "react";
import { Plus, Search, Trash2, Pencil, Check, ExternalLink, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useClientTags } from "@/hooks/useClientTags";
import {
  usePeople, useSavePerson, useDeletePerson, useLogContact, CHANNEL_KINDS, CHANNEL_LABELS, channelHref,
  type PersonFull,
} from "@/hooks/usePeople";
import { computeDueDate, daysUntil, todayISO } from "@/lib/peopleSchedule";

type Filter = "all" | "due";

function DueBadge({ due }: { due: string | null }) {
  if (!due) return <Badge variant="outline">No reminder</Badge>;
  const n = daysUntil(due, todayISO());
  if (n < 0) return <Badge variant="destructive">Overdue {-n}d</Badge>;
  if (n === 0) return <Badge>Today</Badge>;
  if (n <= 7) return <Badge variant="secondary">In {n}d</Badge>;
  return <Badge variant="outline">{due}</Badge>;
}

export default function PeoplePage() {
  const { data: people = [], isLoading } = usePeople();
  const { data: tags } = useClientTags();
  const del = useDeletePerson();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [editing, setEditing] = useState<PersonFull | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [contactFor, setContactFor] = useState<PersonFull | null>(null);

  const rows = useMemo(() => {
    const today = todayISO();
    return people
      .map((p) => ({ p, due: computeDueDate(p) }))
      .filter(({ p }) => p.name.toLowerCase().includes(q.toLowerCase()))
      .filter(({ p }) => tagFilter === "all" || p.client_tag_id === tagFilter)
      .filter(({ due }) => filter === "all" || (due && daysUntil(due, today) <= 0))
      .sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"));
  }, [people, q, filter, tagFilter]);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>People</h1>
          <p className="text-sm text-muted-foreground">People to keep an eye on and when to reach out again.</p>
        </div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus className="h-4 w-4 mr-1" /> Add person</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search by name..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Everyone</SelectItem>
            <SelectItem value="due">To reach out</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tagFilter} onValueChange={setTagFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tags</SelectItem>
            {tags?.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <p className="text-muted-foreground">Loading...</p> : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">
          <Users className="h-8 w-8 mx-auto mb-2" /> No people yet.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map(({ p, due }) => {
            const tag = tags?.find((t) => t.id === p.client_tag_id);
            const last = [...p.person_contacts].sort((a, b) => b.contacted_at.localeCompare(a.contacted_at));
            return (
              <div key={p.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
                <div className="flex items-start gap-3">
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt={p.name} className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold">
                      {p.name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{p.name}</span>
                      {tag && <span className="text-xs rounded-full px-2 py-0.5 border border-border" style={{ color: tag.color }}>{tag.name}</span>}
                    </div>
                    <div className="mt-1"><DueBadge due={due} /></div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => {
                    if (confirm(`Delete ${p.name}?`)) del.mutate(p.id);
                  }}><Trash2 className="h-4 w-4" /></Button>
                </div>

                {p.person_channels.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {p.person_channels.map((c) => {
                      const href = channelHref(c.kind, c.value);
                      const text = `${CHANNEL_LABELS[c.kind] ?? c.kind}${c.label ? ` · ${c.label}` : ""}`;
                      return href ? (
                        <a key={c.id} href={href} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs rounded-md border border-border px-2 py-1 hover:bg-accent">
                          {text} <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span key={c.id} className="text-xs rounded-md border border-border px-2 py-1" title={c.value}>{text}: {c.value}</span>
                      );
                    })}
                  </div>
                )}

                {p.notes && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{p.notes}</p>}

                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {p.last_contacted_at ? `Last contact: ${new Date(p.last_contacted_at).toLocaleDateString()}` : "Never contacted"}
                  </span>
                  <Button size="sm" variant="outline" onClick={() => setContactFor(p)}><Check className="h-3.5 w-3.5 mr-1" /> Contacted today</Button>
                </div>

                {last.length > 0 && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground">History ({last.length})</summary>
                    <ul className="mt-2 space-y-1">
                      {last.map((c) => (
                        <li key={c.id}>
                          <span className="text-muted-foreground">{new Date(c.contacted_at).toLocaleDateString()}</span>
                          {c.channel_kind && ` · ${CHANNEL_LABELS[c.channel_kind] ?? c.channel_kind}`}
                          {c.note && ` — ${c.note}`}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      )}

      <PersonDialog open={dialogOpen} onOpenChange={setDialogOpen} person={editing} />
      <ContactDialog person={contactFor} onClose={() => setContactFor(null)} />
    </div>
  );
}

function PersonDialog({ open, onOpenChange, person }: { open: boolean; onOpenChange: (o: boolean) => void; person: PersonFull | null }) {
  const { data: tags } = useClientTags();
  const save = useSavePerson();
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [tagId, setTagId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [every, setEvery] = useState("");
  const [nextDate, setNextDate] = useState("");
  const [channels, setChannels] = useState<{ kind: string; value: string; label: string }[]>([]);
  const [lastKey, setLastKey] = useState<string | null>(null);

  const key = open ? person?.id ?? "new" : null;
  if (key !== lastKey) {
    setLastKey(key);
    if (open) {
      setName(person?.name ?? "");
      setAvatar(person?.avatar_url ?? "");
      setTagId(person?.client_tag_id ?? null);
      setNotes(person?.notes ?? "");
      setEvery(person?.recontact_every_days ? String(person.recontact_every_days) : "30");
      setNextDate(person?.next_contact_date ?? "");
      setChannels(person?.person_channels.map((c) => ({ kind: c.kind, value: c.value, label: c.label })) ?? [{ kind: "instagram", value: "", label: "" }]);
    }
  }

  const submit = async () => {
    if (!name.trim()) return toast.error("Name is required");
    try {
      await save.mutateAsync({
        id: person?.id, name: name.trim(), avatar_url: avatar.trim() || null, client_tag_id: tagId, notes,
        recontact_every_days: every ? Number(every) : null, next_contact_date: nextDate || null, channels,
      });
      toast.success("Saved");
      onOpenChange(false);
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{person ? "Edit person" : "New person"}</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Tag</Label>
              <Select value={tagId ?? "none"} onValueChange={(v) => setTagId(v === "none" ? null : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No tag</SelectItem>
                  {tags?.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2"><Label>Photo URL (optional)</Label><Input value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="https://..." /></div>

          <div className="space-y-2">
            <Label>Channels</Label>
            {channels.map((c, i) => (
              <div key={i} className="flex gap-2">
                <Select value={c.kind} onValueChange={(v) => setChannels((cs) => cs.map((x, j) => j === i ? { ...x, kind: v } : x))}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>{CHANNEL_KINDS.map((k) => <SelectItem key={k} value={k}>{CHANNEL_LABELS[k]}</SelectItem>)}</SelectContent>
                </Select>
                <Input placeholder="@handle, link, email or number" value={c.value}
                  onChange={(e) => setChannels((cs) => cs.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} />
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setChannels((cs) => cs.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button size="sm" variant="outline" className="w-full" onClick={() => setChannels((cs) => [...cs, { kind: "email", value: "", label: "" }])}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add channel
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Reach out every (days)</Label><Input type="number" min={1} value={every} onChange={(e) => setEvery(e.target.value)} placeholder="e.g. 30" /></div>
            <div className="space-y-2"><Label>Or on a specific date</Label><Input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} /></div>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">A specific date wins over "every X days". You'll get a notification at 09:00 on the due day.</p>

          <div className="space-y-2"><Label>Notes</Label><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={save.isPending}>{save.isPending ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ContactDialog({ person, onClose }: { person: PersonFull | null; onClose: () => void }) {
  const log = useLogContact();
  const [kind, setKind] = useState("none");
  const [note, setNote] = useState("");
  const submit = async () => {
    if (!person) return;
    try {
      await log.mutateAsync({ person, channel_kind: kind === "none" ? null : kind, note });
      toast.success(`Contact with ${person.name} saved`);
      setNote(""); setKind("none"); onClose();
    } catch (e: any) { toast.error(e.message); }
  };
  return (
    <Dialog open={!!person} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Contacted {person?.name}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-2">
            <Label>Channel</Label>
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not specified</SelectItem>
                {CHANNEL_KINDS.map((k) => <SelectItem key={k} value={k}>{CHANNEL_LABELS[k]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Note</Label><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={log.isPending}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
