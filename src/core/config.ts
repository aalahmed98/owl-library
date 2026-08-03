import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export const ARCHIVE_ROOT = process.env.ARCHIVE_ROOT
  ? path.resolve(process.env.ARCHIVE_ROOT)
  : packageRoot;

export const CONTENT_DIR = path.join(ARCHIVE_ROOT, "content");
export const TRASH_DIR_NAME = ".trash";
export const TRASH_DIR = path.join(CONTENT_DIR, TRASH_DIR_NAME);
export const DESIGN_DIR = path.join(ARCHIVE_ROOT, "design");
export const PUBLIC_DIR = path.join(ARCHIVE_ROOT, "public");

export const DOC_EXTENSIONS = [".md", ".html", ".pdf"] as const;
export type DocFormat = "md" | "html" | "pdf";

export const SIDECAR_SUFFIX = ".meta.json";

export const PORT = Number(process.env.ARCHIVE_PORT ?? 7333);

export function formatOf(filePath: string): DocFormat | null {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".md") return "md";
  if (ext === ".html" || ext === ".htm") return "html";
  if (ext === ".pdf") return "pdf";
  return null;
}
