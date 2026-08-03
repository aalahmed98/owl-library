import fs from "node:fs/promises";
import fss from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import matter from "gray-matter";
import { createTwoFilesPatch } from "diff";
import { TRASH_DIR, formatOf } from "./config.js";
import {
  PathError,
  resolveContentPath,
  toRelPath,
  assertDocExtension,
  isInTrash,
  sidecarPathFor,
} from "./paths.js";
import { DocMeta, extractDoc, stringifyMd, today } from "./meta.js";

export class ConflictError extends Error {
  constructor(
    public readonly relPath: string,
    public readonly currentContent: string,
    public readonly currentHash: string,
  ) {
    super(`content of ${relPath} changed on disk (hash mismatch) — re-read before writing`);
    this.name = "ConflictError";
  }
}

export function hashOf(content: string | Buffer): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

export function makeDiff(relPath: string, oldContent: string, newContent: string): string {
  return createTwoFilesPatch(relPath, relPath, oldContent, newContent, "before", "after");
}

export interface DocRead {
  path: string;
  format: "md" | "html" | "pdf";
  meta: DocMeta;
  /** Raw file content for md/html; empty string for pdf. */
  content: string;
  contentHash: string;
  sizeBytes: number;
}

export async function readDoc(relPath: string): Promise<DocRead> {
  const abs = resolveContentPath(relPath);
  assertDocExtension(relPath);
  const fmt = formatOf(abs)!;
  const stat = await fs.stat(abs);
  const { meta } = await extractDoc(abs);
  if (fmt === "pdf") {
    const buf = await fs.readFile(abs);
    return { path: toRelPath(abs), format: fmt, meta, content: "", contentHash: hashOf(buf), sizeBytes: stat.size };
  }
  const content = await fs.readFile(abs, "utf8");
  return { path: toRelPath(abs), format: fmt, meta, content, contentHash: hashOf(content), sizeBytes: stat.size };
}

async function guardHash(abs: string, relPath: string, baseHash: string): Promise<string> {
  const current = await fs.readFile(abs, "utf8");
  if (hashOf(current) !== baseHash) {
    throw new ConflictError(relPath, current, hashOf(current));
  }
  return current;
}

/** For .md, meta is serialized as frontmatter (content = body). For .html, content is the full file. */
export async function createDoc(
  relPath: string,
  content: string,
  meta?: Partial<DocMeta>,
): Promise<{ path: string; contentHash: string }> {
  const abs = resolveContentPath(relPath);
  assertDocExtension(relPath);
  if (isInTrash(relPath)) throw new PathError("cannot create inside .trash", relPath);
  if (fss.existsSync(abs)) throw new PathError("already exists (use update instead)", relPath);
  const fmt = formatOf(abs)!;
  if (fmt === "pdf") throw new PathError("PDFs cannot be created from text; copy the file and use set_meta", relPath);

  let fileContent = content;
  if (fmt === "md") {
    const { data, content: body } = matter(content);
    const full: DocMeta = {
      title: path.basename(relPath),
      tags: [],
      ...data,
      ...meta,
      created: meta?.created ?? (data.created as string | undefined) ?? today(),
      updated: today(),
    };
    fileContent = stringifyMd(full, body);
  }
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, fileContent, { flag: "wx" });
  return { path: toRelPath(abs), contentHash: hashOf(fileContent) };
}

function bumpUpdated(abs: string, content: string): string {
  if (formatOf(abs) !== "md") return content;
  const { data, content: body } = matter(content);
  data.updated = today();
  return stringifyMd({ title: path.basename(abs), tags: [], ...data } as DocMeta, body);
}

export async function updateDoc(
  relPath: string,
  content: string,
  baseHash: string,
): Promise<{ path: string; contentHash: string; diff: string }> {
  const abs = resolveContentPath(relPath);
  assertDocExtension(relPath);
  if (formatOf(abs) === "pdf") throw new PathError("PDF content cannot be edited as text", relPath);
  const old = await guardHash(abs, relPath, baseHash);
  const next = bumpUpdated(abs, content);
  await fs.writeFile(abs, next);
  return { path: toRelPath(abs), contentHash: hashOf(next), diff: makeDiff(relPath, old, next) };
}

export interface TextEdit {
  oldText: string;
  newText: string;
}

export async function editDoc(
  relPath: string,
  edits: TextEdit[],
  baseHash: string,
): Promise<{ path: string; contentHash: string; diff: string }> {
  const abs = resolveContentPath(relPath);
  assertDocExtension(relPath);
  if (formatOf(abs) === "pdf") throw new PathError("PDF content cannot be edited as text", relPath);
  const old = await guardHash(abs, relPath, baseHash);
  let next = old;
  for (const [i, e] of edits.entries()) {
    const first = next.indexOf(e.oldText);
    if (first === -1) throw new Error(`edit ${i + 1}: oldText not found in ${relPath}`);
    if (next.indexOf(e.oldText, first + 1) !== -1) {
      throw new Error(`edit ${i + 1}: oldText matches more than once in ${relPath}; provide more context`);
    }
    next = next.slice(0, first) + e.newText + next.slice(first + e.oldText.length);
  }
  next = bumpUpdated(abs, next);
  await fs.writeFile(abs, next);
  return { path: toRelPath(abs), contentHash: hashOf(next), diff: makeDiff(relPath, old, next) };
}

/** Move a doc or folder into content/.trash/<ISO>__<name>. Never unlinks. */
export async function deleteToTrash(relPath: string): Promise<{ trashedTo: string }> {
  const abs = resolveContentPath(relPath);
  if (abs === resolveContentPath("")) throw new PathError("refusing to trash the content root", relPath);
  if (isInTrash(relPath)) throw new PathError("already in .trash", relPath);
  if (!fss.existsSync(abs)) throw new PathError("does not exist", relPath);
  await fs.mkdir(TRASH_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dest = path.join(TRASH_DIR, `${stamp}__${path.basename(abs)}`);
  await fs.rename(abs, dest);
  // PDF sidecar rides along
  const sidecar = sidecarPathFor(abs);
  if (fss.existsSync(sidecar)) {
    await fs.rename(sidecar, path.join(TRASH_DIR, `${stamp}__${path.basename(sidecar)}`));
  }
  return { trashedTo: toRelPath(dest) };
}

export async function moveNode(fromRel: string, toRel: string): Promise<{ from: string; to: string }> {
  const fromAbs = resolveContentPath(fromRel);
  const toAbs = resolveContentPath(toRel);
  if (!fss.existsSync(fromAbs)) throw new PathError("source does not exist", fromRel);
  if (fss.existsSync(toAbs)) throw new PathError("destination already exists", toRel);
  const isFile = (await fs.stat(fromAbs)).isFile();
  if (isFile && formatOf(fromAbs) && path.extname(fromAbs).toLowerCase() !== path.extname(toAbs).toLowerCase()) {
    throw new PathError("cannot change file extension in a move", toRel);
  }
  await fs.mkdir(path.dirname(toAbs), { recursive: true });
  await fs.rename(fromAbs, toAbs);
  const fromSidecar = sidecarPathFor(fromAbs);
  if (isFile && fss.existsSync(fromSidecar)) {
    await fs.rename(fromSidecar, sidecarPathFor(toAbs));
  }
  return { from: toRelPath(fromAbs), to: toRelPath(toAbs) };
}

export async function createFolder(relPath: string): Promise<{ path: string }> {
  const abs = resolveContentPath(relPath);
  if (isInTrash(relPath)) throw new PathError("cannot create inside .trash", relPath);
  await fs.mkdir(abs, { recursive: true });
  return { path: toRelPath(abs) };
}
