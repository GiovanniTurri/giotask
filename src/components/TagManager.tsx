import { useState } from "react";
import { useClientTags, useCreateClientTag, useUpdateClientTag, useDeleteClientTag } from "@/hooks/useClientTags";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const PRESET_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#06b6d4",
];

interface TagManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TagManager({ open, onOpenChange }: TagManagerProps) {
  const { data: tags } = useClientTags();
  const createTag = useCreateClientTag();
  const updateTag = useUpdateClientTag();
  const deleteTag = useDeleteClientTag();

  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const resetForm = () => { setName(""); setColor(PRESET_COLORS[0]); setEditingId(null); };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    try {
      if (editingId) {
        await updateTag.mutateAsync({ id: editingId, name: name.trim(), color });
        toast.success("Tag updated");
      } else {
        await createTag.mutateAsync({ name: name.trim(), color });
        toast.success("Tag created");
      }
      resetForm();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTag.mutateAsync(id);
      toast.success("Tag deleted");
      if (editingId === id) resetForm();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const startEdit = (tag: { id: string; name: string; color: string }) => {
    setEditingId(tag.id);
    setName(tag.name);
    setColor(tag.color);
  };

  return (
    <Dialog open={open} onOpenChange={v => { onOpenChange(v); if (!v) resetForm(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Client Tags</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {tags?.map(tag => (
              <div key={tag.id} className="flex items-center gap-1">
                <Badge className="cursor-default" style={{ backgroundColor: tag.color, color: "#fff", borderColor: tag.color }}>
                  {tag.name}
                </Badge>
                <button onClick={() => startEdit(tag)} className="p-0.5 rounded hover:bg-muted">
                  <Pencil className="h-3 w-3 text-muted-foreground" />
                </button>
                <button onClick={() => handleDelete(tag.id)} className="p-0.5 rounded hover:bg-destructive/10">
                  <Trash2 className="h-3 w-3 text-destructive" />
                </button>
              </div>
            ))}
            {(!tags || tags.length === 0) && <p className="text-sm text-muted-foreground">No tags yet</p>}
          </div>

          <div className="space-y-3 border-t pt-4">
            <div className="space-y-2">
              <Label>{editingId ? "Edit Tag" : "New Tag"}</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Tag name..." />
            </div>
            <div className="flex gap-1.5">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                  style={{ backgroundColor: c, borderColor: color === c ? "hsl(var(--foreground))" : "transparent" }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={createTag.isPending || updateTag.isPending}>
                <Plus className="h-4 w-4 mr-1" />
                {editingId ? "Update" : "Add"}
              </Button>
              {editingId && <Button size="sm" variant="ghost" onClick={resetForm}>Cancel</Button>}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
