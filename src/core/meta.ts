import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { parse as parseHtml } from "node-html-parser";
import { formatOf } from "./config.js";
import { sidecarPathFor, resolveContentPath, toRelPath } from "./paths.js";

export type DocStatus = "draft" | "final" | "archived";
export type DocSpace = "haman" | "ali" | "shared";
export const DEFAULT_SPACE: DocSpace = "haman";

export interface DocMeta {
  title: string;
  tags: string[];
  summary?: string;
  created?: string; // YYYY-MM-DD
  updated?: string; // YYYY-MM-DD
  status?: DocStatus;
  source?: string;
  authors?: string[];
  /** Whose browsing tab this shows under: draft workspace (haman/ali) or the shared/published tab. Missing = treated as DEFAULT_SPACE. */
  space?: DocSpace;
}

export interface ExtractedDoc {
  meta: DocMeta;
  /** Plain text used for search indexing (md body / html text content; empty for pdf). */
  bodyText: string;
  headings: string[];
}

const HTML_META_KEYS = ["tags", "summary", "created", "updated", "status", "source", "authors", "space"] as const;

function titleFromFilename(absPath: string): string {
  return path.basename(absPath).replace(/\.(md|html?|pdf)$/i, "").replace(/[-_]+/g, " ");
}

function normalizeMeta(raw: Record<string, unknown>, absPath: string): DocMeta {
  const asArray = (v: unknown): string[] =>
    Array.isArray(v) ? v.map(String) : typeof v === "string" && v.trim() ? v.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const asStr = (v: unknown): string | undefined =>
    typeof v === "string" && v.trim() ? v.trim() : v instanceof Date ? v.toISOString().slice(0, 10) : undefined;
  const status = asStr(raw.status);
  const space = asStr(raw.space);
  return {
    title: asStr(raw.title) ?? titleFromFilename(absPath),
    tags: asArray(raw.tags).map((t) => t.toLowerCase()),
    summary: asStr(raw.summary),
    created: asStr(raw.created),
    updated: asStr(raw.updated),
    status: status === "draft" || status === "final" || status === "archived" ? status : undefined,
    source: asStr(raw.source),
    authors: asArray(raw.authors).length ? asArray(raw.authors) : undefined,
    space: space === "haman" || space === "ali" || space === "shared" ? space : undefined,
  };
}

function extractMd(absPath: string, src: string): ExtractedDoc {
  const { data, content } = matter(src);
  const headings = [...content.matchAll(/^#{1,6}\s+(.+)$/gm)].map((m) => (m[1] ?? "").trim());
  return { meta: normalizeMeta(data, absPath), bodyText: content, headings };
}

function extractHtml(absPath: string, src: string): ExtractedDoc {
  const root = parseHtml(src);
  const raw: Record<string, unknown> = {};
  raw.title = root.querySelector("title")?.text;
  for (const key of HTML_META_KEYS) {
    const el = root.querySelector(`meta[name="archive-${key}"]`);
    if (el) raw[key] = el.getAttribute("content");
  }
  const headings = root.querySelectorAll("h1, h2, h3").map((h) => h.text.trim());
  for (const el of root.querySelectorAll("script, style")) el.remove();
  // structuredText separates block elements with newlines (plain .text concatenates them)
  const bodyText = (root.querySelector("body") ?? root).structuredText.replace(/\s+/g, " ").trim();
  return { meta: normalizeMeta(raw, absPath), bodyText, headings };
}

async function readSidecar(absPdfPath: string): Promise<Record<string, unknown>> {
  try {
    return JSON.parse(await fs.readFile(sidecarPathFor(absPdfPath), "utf8"));
  } catch {
    return {};
  }
}

/** Extract normalized metadata + searchable text from a doc on disk. */
export async function extractDoc(absPath: string): Promise<ExtractedDoc> {
  const fmt = formatOf(absPath);
  if (fmt === "md") return extractMd(absPath, await fs.readFile(absPath, "utf8"));
  if (fmt === "html") return extractHtml(absPath, await fs.readFile(absPath, "utf8"));
  if (fmt === "pdf") {
    return { meta: normalizeMeta(await readSidecar(absPath), absPath), bodyText: "", headings: [] };
  }
  throw new Error(`not a document: ${absPath}`);
}

function cleanMeta(meta: DocMeta): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (v === undefined || (Array.isArray(v) && v.length === 0)) continue;
    out[k] = v;
  }
  return out;
}

/** Serialize markdown with frontmatter from meta + body. */
export function stringifyMd(meta: DocMeta, body: string): string {
  return matter.stringify(body.startsWith("\n") ? body : "\n" + body, cleanMeta(meta));
}

function upsertHtmlMeta(src: string, meta: DocMeta): string {
  const root = parseHtml(src);
  const head = root.querySelector("head");
  if (!head) throw new Error("HTML doc has no <head>; cannot write metadata");
  const titleEl = head.querySelector("title");
  if (titleEl) titleEl.set_content(meta.title);
  else head.insertAdjacentHTML("afterbegin", `<title>${meta.title}</title>`);
  for (const key of HTML_META_KEYS) {
    const v = meta[key as keyof DocMeta];
    const content = Array.isArray(v) ? v.join(", ") : v ?? "";
    const existing = head.querySelector(`meta[name="archive-${key}"]`);
    if (!content) {
      existing?.remove();
    } else if (existing) {
      existing.setAttribute("content", content);
    } else {
      head.insertAdjacentHTML("beforeend", `\n  <meta name="archive-${key}" content="${content.replace(/"/g, "&quot;")}">`);
    }
  }
  return root.toString();
}

/**
 * Merge partial metadata into a doc on disk (frontmatter / html meta tags /
 * pdf sidecar) without touching the body. Returns the new full meta.
 */
export async function writeMeta(relPath: string, partial: Partial<DocMeta>): Promise<DocMeta> {
  const abs = resolveContentPath(relPath);
  const fmt = formatOf(abs);
  const current = await extractDoc(abs);
  const merged: DocMeta = { ...current.meta, ...partial };
  if (partial.tags) merged.tags = partial.tags.map((t) => t.toLowerCase());

  if (fmt === "md") {
    const { content } = matter(await fs.readFile(abs, "utf8"));
    await fs.writeFile(abs, stringifyMd(merged, content));
  } else if (fmt === "html") {
    await fs.writeFile(abs, upsertHtmlMeta(await fs.readFile(abs, "utf8"), merged));
  } else if (fmt === "pdf") {
    await fs.writeFile(sidecarPathFor(abs), JSON.stringify(cleanMeta(merged), null, 2) + "\n");
  } else {
    throw new Error(`not a document: ${toRelPath(abs)}`);
  }
  return merged;
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
