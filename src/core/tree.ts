import fs from "node:fs/promises";
import path from "node:path";
import { CONTENT_DIR, TRASH_DIR_NAME, formatOf, DocFormat } from "./config.js";
import { resolveContentPath, toRelPath, isSidecar } from "./paths.js";
import { extractDoc, DEFAULT_SPACE, DocSpace, Identity, visibleTo } from "./meta.js";

export interface DocNode {
  kind: "doc";
  name: string;
  path: string;
  format: DocFormat;
  title: string;
  tags: string[];
  summary?: string;
  status?: string;
  /** From metadata (frontmatter / html meta / sidecar), YYYY-MM-DD. */
  created?: string;
  /** File mtime, YYYY-MM-DD — fallback recency signal when `created` is absent. */
  modified: string;
  /** Draft/published tab this doc shows under; falls back to DEFAULT_SPACE when unset. */
  space: DocSpace;
}

export interface FolderNode {
  kind: "folder";
  name: string;
  path: string;
  children: TreeNode[];
}

export type TreeNode = DocNode | FolderNode;

export async function buildTree(rel = "", depth = Infinity): Promise<FolderNode> {
  const abs = resolveContentPath(rel);
  const relNorm = toRelPath(abs);
  const node: FolderNode = {
    kind: "folder",
    name: relNorm === "" ? "content" : path.basename(abs),
    path: relNorm,
    children: [],
  };
  if (depth <= 0) return node;

  const entries = await fs.readdir(abs, { withFileTypes: true });
  entries.sort((a, b) => {
    if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  for (const e of entries) {
    if (e.name.startsWith(".") || e.name === TRASH_DIR_NAME) continue;
    const childRel = relNorm ? `${relNorm}/${e.name}` : e.name;
    if (e.isDirectory()) {
      node.children.push(await buildTree(childRel, depth - 1));
      continue;
    }
    if (isSidecar(e.name)) continue;
    const fmt = formatOf(e.name);
    if (!fmt) continue;
    const modified = (await fs.stat(path.join(abs, e.name))).mtime.toISOString().slice(0, 10);
    try {
      const { meta } = await extractDoc(path.join(abs, e.name));
      node.children.push({
        kind: "doc",
        name: e.name,
        path: childRel,
        format: fmt,
        title: meta.title,
        tags: meta.tags,
        summary: meta.summary,
        status: meta.status,
        created: meta.created,
        modified,
        space: meta.space ?? DEFAULT_SPACE,
      });
    } catch {
      node.children.push({
        kind: "doc", name: e.name, path: childRel, format: fmt,
        title: e.name, tags: [], modified, space: DEFAULT_SPACE,
      });
    }
  }
  return node;
}

/**
 * Prune docs this person cannot see. Folders are shared structure and always
 * remain visible (one containing only the other person's private docs shows as empty).
 */
export function filterTreeVisible(root: FolderNode, identity: Identity): FolderNode {
  return {
    ...root,
    children: root.children.flatMap((c): TreeNode[] => {
      if (c.kind === "folder") return [filterTreeVisible(c, identity)];
      return visibleTo(c.space, identity) ? [c] : [];
    }),
  };
}

/** All docs in a built tree, flattened. */
export function collectDocs(root: FolderNode): DocNode[] {
  const out: DocNode[] = [];
  const walk = (n: TreeNode): void => {
    if (n.kind === "doc") out.push(n);
    else n.children.forEach(walk);
  };
  walk(root);
  return out;
}

/** All folder paths in a built tree ("" = content root), depth-first. */
export function collectFolders(root: FolderNode): string[] {
  const out: string[] = [root.path];
  for (const c of root.children) if (c.kind === "folder") out.push(...collectFolders(c));
  return out;
}

/** Flat list of all doc paths under content/ (excluding .trash and sidecars). */
export async function listDocPaths(): Promise<string[]> {
  const out: string[] = [];
  async function walk(abs: string): Promise<void> {
    const entries = await fs.readdir(abs, { withFileTypes: true });
    for (const e of entries) {
      if (e.name.startsWith(".") || e.name === TRASH_DIR_NAME) continue;
      const child = path.join(abs, e.name);
      if (e.isDirectory()) await walk(child);
      else if (!isSidecar(e.name) && formatOf(e.name)) out.push(toRelPath(child));
    }
  }
  await walk(CONTENT_DIR);
  return out;
}
