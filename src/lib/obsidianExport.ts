/**
 * Convert a couple-life task or AI suggestion into an Obsidian-compatible
 * Markdown note with YAML frontmatter, then trigger a browser download.
 */

export interface ObsidianNotePayload {
  title: string;
  description?: string | null;
  reason?: string | null;
  scheduledDate?: string | null;
  scheduledTime?: string | null;
  durationMinutes?: number | null;
  occasion?: string | null;
  tags?: string[];
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "note";
}

export function buildObsidianNote(payload: ObsidianNotePayload): string {
  const tags = Array.from(new Set(["couple", "focus", ...(payload.tags || [])])).filter(Boolean);
  const lines: string[] = [];
  lines.push("---");
  lines.push(`title: "${payload.title.replace(/"/g, '\\"')}"`);
  if (payload.scheduledDate) lines.push(`date: ${payload.scheduledDate}`);
  if (payload.scheduledTime) lines.push(`time: "${payload.scheduledTime}"`);
  if (payload.durationMinutes) lines.push(`duration_minutes: ${payload.durationMinutes}`);
  if (payload.occasion) lines.push(`occasion: "${payload.occasion}"`);
  lines.push(`tags: [${tags.join(", ")}]`);
  lines.push(`created: ${new Date().toISOString()}`);
  lines.push("---");
  lines.push("");
  lines.push(`# ${payload.title}`);
  lines.push("");
  if (payload.description) {
    lines.push(payload.description);
    lines.push("");
  }
  if (payload.reason) {
    lines.push("## Why this idea");
    lines.push(payload.reason);
    lines.push("");
  }
  return lines.join("\n");
}

export function downloadObsidianNote(payload: ObsidianNotePayload) {
  const md = buildObsidianNote(payload);
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugify(payload.title)}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Parse a single Markdown file (Obsidian note) into a normalized record.
 * Extracts: title (from first H1 or filename), tags (from frontmatter and inline #tags),
 * and trimmed body content (capped at ~8 KB).
 */
export interface ParsedNote {
  path: string;
  title: string;
  content: string;
  tags: string[];
  source_mtime: string | null;
}

const MAX_CONTENT = 8000;

export function parseMarkdownNote(relativePath: string, raw: string, mtime: number | null): ParsedNote {
  const tags = new Set<string>();
  let body = raw;
  let frontmatterTitle: string | null = null;

  const fmMatch = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (fmMatch) {
    body = raw.slice(fmMatch[0].length);
    const fm = fmMatch[1];
    const tagsLine = fm.match(/^tags\s*:\s*(.+)$/m);
    if (tagsLine) {
      const value = tagsLine[1].trim();
      if (value.startsWith("[")) {
        value.replace(/[\[\]]/g, "").split(",").forEach((t) => {
          const clean = t.trim().replace(/^["']|["']$/g, "");
          if (clean) tags.add(clean.toLowerCase());
        });
      } else {
        value.split(/\s+/).forEach((t) => { if (t) tags.add(t.replace(/^#/, "").toLowerCase()); });
      }
    }
    const titleLine = fm.match(/^title\s*:\s*(.+)$/m);
    if (titleLine) frontmatterTitle = titleLine[1].trim().replace(/^["']|["']$/g, "");
  }

  // Inline #tag captures (avoid headings: only match tags preceded by space or start-of-line, not #heading)
  const inlineTagRe = /(?:^|[\s(])#([a-z0-9][a-z0-9\-_/]*)/gi;
  let m: RegExpExecArray | null;
  while ((m = inlineTagRe.exec(body))) {
    tags.add(m[1].toLowerCase());
  }

  const h1 = body.match(/^#\s+(.+)$/m);
  const filename = relativePath.split("/").pop()?.replace(/\.md$/i, "") || relativePath;
  const title = frontmatterTitle || (h1 ? h1[1].trim() : filename);

  return {
    path: relativePath,
    title: title.slice(0, 200),
    content: body.trim().slice(0, MAX_CONTENT),
    tags: Array.from(tags).slice(0, 30),
    source_mtime: mtime ? new Date(mtime).toISOString() : null,
  };
}

export function isPartnerRelevant(note: ParsedNote, keywords: string[], partnerDisplayName: string): boolean {
  const haystack = `${note.path} ${note.title} ${note.tags.join(" ")} ${note.content.slice(0, 400)}`.toLowerCase();
  const all = [...keywords, partnerDisplayName].map((k) => k.trim().toLowerCase()).filter(Boolean);
  return all.some((k) => haystack.includes(k));
}
