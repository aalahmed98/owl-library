import path from "node:path";
import fs from "node:fs";
import { CONTENT_DIR, SIDECAR_SUFFIX, TRASH_DIR_NAME, formatOf } from "./config.js";

export class PathError extends Error {
  constructor(message: string, public readonly relPath: string) {
    super(message);
    this.name = "PathError";
  }
}

/**
 * Resolve a content-relative path to an absolute path, guaranteed to stay
 * inside CONTENT_DIR. Rejects absolute paths, `..`, null bytes, and symlink
 * escapes (checked against the nearest existing ancestor's realpath).
 */
export function resolveContentPath(rel: string): string {
  if (typeof rel !== "string") throw new PathError("path must be a string", String(rel));
  if (rel.includes("\0")) throw new PathError("path contains a null byte", rel);
  const normalized = rel.replace(/\\/g, "/").replace(/^\/+/, "");
  if (normalized.split("/").some((seg) => seg === "..")) {
    throw new PathError("path may not contain '..'", rel);
  }
  const abs = path.resolve(CONTENT_DIR, normalized);
  if (abs !== CONTENT_DIR && !abs.startsWith(CONTENT_DIR + path.sep)) {
    throw new PathError("path escapes the content root", rel);
  }
  // Defeat symlink escapes: realpath the nearest existing ancestor.
  let probe = abs;
  while (!fs.existsSync(probe)) probe = path.dirname(probe);
  const real = fs.realpathSync(probe);
  const realContent = fs.realpathSync(CONTENT_DIR);
  if (real !== realContent && !real.startsWith(realContent + path.sep)) {
    throw new PathError("path resolves outside the content root", rel);
  }
  return abs;
}

export function toRelPath(abs: string): string {
  return path.relative(CONTENT_DIR, abs).split(path.sep).join("/");
}

export function assertDocExtension(rel: string): void {
  if (!formatOf(rel)) {
    throw new PathError(`unsupported extension (allowed: .md, .html, .pdf)`, rel);
  }
}

export function isSidecar(rel: string): boolean {
  return rel.endsWith(SIDECAR_SUFFIX);
}

export function isInTrash(rel: string): boolean {
  const first = rel.replace(/^\/+/, "").split("/")[0];
  return first === TRASH_DIR_NAME;
}

export function sidecarPathFor(pdfRel: string): string {
  return pdfRel + SIDECAR_SUFFIX;
}
