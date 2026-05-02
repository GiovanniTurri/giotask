import { useEffect, useRef, useState } from "react";
import { BookOpen, Loader2, Save, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useBrainConfig, useUpdateBrainConfig } from "@/hooks/useBrainConfig";
import { useBrainNotes, useDeleteAllBrainNotes } from "@/hooks/useBrainNotes";
import { usePartnerProfile } from "@/hooks/usePartnerProfile";
import { isPartnerRelevant, parseMarkdownNote } from "@/lib/obsidianExport";

// Allow webkitdirectory on input element
declare module "react" {
  interface InputHTMLAttributes<T> {
    webkitdirectory?: string;
    directory?: string;
  }
}

export function SecondBrainSettings() {
  const { data: config, isLoading } = useBrainConfig();
  const update = useUpdateBrainConfig();
  const { data: profile } = usePartnerProfile();
  const { data: notes } = useBrainNotes();
  const deleteAll = useDeleteAllBrainNotes();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [subfolder, setSubfolder] = useState("");
  const [keywords, setKeywords] = useState("");
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (config) {
      setSubfolder(config.vault_subfolder || "");
      setKeywords((config.partner_keywords || []).join(", "));
    }
  }, [config]);

  if (isLoading || !config) {
    return (
      <Card className="p-5 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  const partnerCount = (notes || []).filter((n) => n.is_partner_relevant).length;

  const saveConfig = async () => {
    try {
      await update.mutateAsync({
        id: config.id,
        vault_subfolder: subfolder.trim().replace(/^\/+|\/+$/g, ""),
        partner_keywords: keywords.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean),
      });
      toast.success("Second brain settings saved");
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    }
  };

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    const subfolderNorm = (config.vault_subfolder || "").replace(/^\/+|\/+$/g, "").toLowerCase();

    const mdFiles = files.filter((f) => /\.md$/i.test(f.name));
    if (mdFiles.length === 0) {
      toast.error("No .md files found in the selected folder");
      return;
    }

    const filtered = subfolderNorm
      ? mdFiles.filter((f) => {
          const rel = (f.webkitRelativePath || f.name).toLowerCase();
          return rel.includes(`/${subfolderNorm}/`) || rel.startsWith(`${subfolderNorm}/`);
        })
      : mdFiles;

    if (filtered.length === 0) {
      toast.error(`No .md files matched subfolder "${config.vault_subfolder}". Clear the subfolder filter or pick a different vault.`);
      return;
    }

    if (filtered.length > 2000) {
      toast.error(`Too many notes (${filtered.length}). Narrow the subfolder filter and try again.`);
      return;
    }

    setImporting(true);
    try {
      const keywordsList = config.partner_keywords || [];
      const partnerName = profile?.display_name || "";
      const parsed = await Promise.all(
        filtered.map(async (file) => {
          const text = await file.text();
          const rel = file.webkitRelativePath || file.name;
          const note = parseMarkdownNote(rel, text, file.lastModified || null);
          return {
            ...note,
            is_partner_relevant: isPartnerRelevant(note, keywordsList, partnerName),
          };
        })
      );

      const { data, error } = await supabase.functions.invoke("ingest-brain-notes", {
        body: { notes: parsed, replace_all: true },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Imported ${data?.count ?? parsed.length} notes (${parsed.filter((n) => n.is_partner_relevant).length} partner-relevant)`);
    } catch (e: any) {
      toast.error(e.message || "Import failed");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const wipe = async () => {
    if (!confirm("Delete all imported brain notes? You can re-import any time.")) return;
    try {
      await deleteAll.mutateAsync();
      toast.success("Brain notes cleared");
    } catch (e: any) {
      toast.error(e.message || "Failed to clear");
    }
  };

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-primary" />
        <Label className="text-sm font-semibold">Second brain (Obsidian)</Label>
      </div>
      <p className="text-xs text-muted-foreground -mt-1">
        Import Markdown notes from a folder of your Obsidian vault. The Couple Life AI uses partner-relevant notes
        as soft context when generating ideas. Files are read in your browser; only their text is stored.
      </p>

      <div className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground">Vault subfolder filter</Label>
          <Input
            value={subfolder}
            onChange={(e) => setSubfolder(e.target.value)}
            placeholder="e.g. Couple or People/Giulia"
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            Only .md files inside this subfolder will be imported. Leave empty to import the whole vault.
          </p>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">
            Partner keywords <span className="text-[10px] opacity-60">(comma-separated)</span>
          </Label>
          <Input
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="couple, partner, girlfriend, coppia"
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            Notes whose path, title, tags, or first paragraph contain any keyword (or your partner's display name) are flagged for AI use.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={saveConfig} disabled={update.isPending}>
          {update.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
          Save settings
        </Button>
      </div>

      <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="text-xs text-muted-foreground">
            {notes?.length ? (
              <>
                <strong>{notes.length}</strong> notes imported · <strong>{partnerCount}</strong> partner-relevant
                {config.last_imported_at && (
                  <> · {formatDistanceToNow(new Date(config.last_imported_at), { addSuffix: true })}</>
                )}
              </>
            ) : (
              "No notes imported yet."
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            {importing ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1" />}
            Import vault folder
          </Button>
          <Button size="sm" variant="ghost" onClick={wipe} disabled={!notes?.length || deleteAll.isPending}>
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear notes
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          webkitdirectory=""
          directory=""
          multiple
          accept=".md,text/markdown"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <p className="text-[11px] text-muted-foreground">
          Tip: pick the root of your Obsidian vault — the subfolder filter above narrows the import.
          Re-importing replaces the existing cache.
        </p>
      </div>
    </Card>
  );
}
