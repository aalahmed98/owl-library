import fs from "node:fs/promises";
import MiniSearch from "minisearch";
import { resolveContentPath } from "./paths.js";
import { extractDoc } from "./meta.js";
import { listDocPaths } from "./tree.js";
import { formatOf } from "./config.js";

interface IndexedDoc {
  id: string; // rel path
  title: string;
  tags: string;
  headings: string;
  body: string;
  format: string;
  summary: string;
}

export interface SearchHit {
  path: string;
  title: string;
  tags: string[];
  format: string;
  score: number;
  snippet: string;
}

export interface SearchOptions {
  tags?: string[];
  folder?: string;
  limit?: number;
}

function makeSnippet(body: string, query: string, width = 180): string {
  const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  const lower = body.toLowerCase();
  let idx = -1;
  for (const t of terms) {
    idx = lower.indexOf(t);
    if (idx !== -1) break;
  }
  if (idx === -1) idx = 0;
  const start = Math.max(0, idx - Math.floor(width / 3));
  const raw = body.slice(start, start + width).replace(/\s+/g, " ").trim();
  return (start > 0 ? "…" : "") + raw + (start + width < body.length ? "…" : "");
}

export class ArchiveIndex {
  private mini = ArchiveIndex.newMini();
  private docs = new Map<string, IndexedDoc>();
  private lastBuilt = 0;

  private static newMini(): MiniSearch<IndexedDoc> {
    return new MiniSearch<IndexedDoc>({
      fields: ["title", "tags", "headings", "body"],
      storeFields: ["title", "tags", "format", "summary"],
      searchOptions: {
        boost: { title: 4, tags: 3, headings: 2 },
        prefix: true,
        fuzzy: 0.2,
      },
    });
  }

  async buildFromDisk(): Promise<number> {
    this.mini = ArchiveIndex.newMini();
    this.docs.clear();
    const paths = await listDocPaths();
    for (const rel of paths) {
      await this.upsert(rel, { silent: true });
    }
    this.lastBuilt = Date.now();
    return this.docs.size;
  }

  async upsert(rel: string, opts?: { silent?: boolean }): Promise<void> {
    try {
      if (!formatOf(rel)) return;
      const { meta, bodyText, headings } = await extractDoc(resolveContentPath(rel));
      const doc: IndexedDoc = {
        id: rel,
        title: meta.title,
        tags: meta.tags.join(" "),
        headings: headings.join(" "),
        body: bodyText,
        format: formatOf(rel)!,
        summary: meta.summary ?? "",
      };
      if (this.mini.has(rel)) this.mini.discard(rel);
      this.mini.add(doc);
      this.docs.set(rel, doc);
    } catch (err) {
      if (!opts?.silent) throw err;
    }
  }

  remove(rel: string): void {
    if (this.mini.has(rel)) this.mini.discard(rel);
    this.docs.delete(rel);
  }

  /** Cheap staleness check for long-lived MCP sessions: any doc mtime newer than last build? */
  async needsRefresh(): Promise<boolean> {
    if (this.lastBuilt === 0) return true;
    const paths = await listDocPaths();
    if (paths.length !== this.docs.size) return true;
    for (const rel of paths) {
      try {
        const stat = await fs.stat(resolveContentPath(rel));
        if (stat.mtimeMs > this.lastBuilt) return true;
        if (!this.docs.has(rel)) return true;
      } catch {
        return true;
      }
    }
    return false;
  }

  query(q: string, opts: SearchOptions = {}): SearchHit[] {
    const limit = opts.limit ?? 10;
    const results = this.mini.search(q);
    const hits: SearchHit[] = [];
    for (const r of results) {
      const doc = this.docs.get(r.id as string);
      if (!doc) continue;
      const docTags = doc.tags ? doc.tags.split(" ") : [];
      if (opts.tags?.length && !opts.tags.every((t) => docTags.includes(t.toLowerCase()))) continue;
      if (opts.folder && !(r.id as string).startsWith(opts.folder.replace(/^\/+|\/+$/g, "") + "/")) continue;
      hits.push({
        path: r.id as string,
        title: doc.title,
        tags: docTags,
        format: doc.format,
        score: r.score,
        snippet: doc.summary || makeSnippet(doc.body, q),
      });
      if (hits.length >= limit) break;
    }
    return hits;
  }

  listTags(): { tag: string; count: number }[] {
    const counts = new Map<string, number>();
    for (const doc of this.docs.values()) {
      for (const t of doc.tags.split(" ")) {
        if (t) counts.set(t, (counts.get(t) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  }

  get size(): number {
    return this.docs.size;
  }
}
