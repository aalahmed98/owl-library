// Shared MCP tool definitions — used by both the stdio entrypoint (main.ts, for
// local/Desktop use) and the HTTP-mounted endpoint (server/routes/mcp.ts, for remote agents).
// Every server instance is bound to an identity (haman/ali) and sees exactly what
// that person sees on the website: their private docs + shared docs.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  readDoc, createDoc, updateDoc, editDoc, deleteToTrash, moveNode, createFolder, ConflictError,
} from "../core/docs.js";
import { writeMeta, visibleTo, DocMeta, DocSpace, Identity } from "../core/meta.js";
import { buildTree, filterTreeVisible, TreeNode } from "../core/tree.js";
import { ArchiveIndex } from "../core/search.js";
import { PathError } from "../core/paths.js";
import { formatOf } from "../core/config.js";

function ok(payload: unknown): { content: { type: "text"; text: string }[] } {
  return { content: [{ type: "text", text: typeof payload === "string" ? payload : JSON.stringify(payload, null, 2) }] };
}

function fail(message: string): { content: { type: "text"; text: string }[]; isError: true } {
  return { content: [{ type: "text", text: message }], isError: true };
}

function describeError(err: unknown): { content: { type: "text"; text: string }[]; isError: true } {
  if (err instanceof ConflictError) {
    return fail(
      `CONFLICT: ${err.message}\nCurrent hash: ${err.currentHash}\nCurrent content:\n${err.currentContent}`,
    );
  }
  if (err instanceof PathError) return fail(`PATH ERROR (${err.relPath}): ${err.message}`);
  if ((err as NodeJS.ErrnoException)?.code === "ENOENT") return fail("NOT FOUND: no such doc or folder");
  return fail(`ERROR: ${(err as Error).message}`);
}

function renderTree(node: TreeNode, indent = ""): string {
  if (node.kind === "doc") {
    const tags = node.tags.length ? ` [${node.tags.join(", ")}]` : "";
    return `${indent}${node.name} — "${node.title}" (${node.format})${tags}`;
  }
  const lines = [`${indent}${node.path === "" ? "content/" : node.name + "/"}`];
  for (const c of node.children) lines.push(renderTree(c, indent + "  "));
  return lines.join("\n");
}

const metaShape = {
  title: z.string().optional(),
  tags: z.array(z.string()).optional().describe("lowercase, singular; check list_tags for existing tags first"),
  summary: z.string().optional(),
  created: z.string().optional().describe("YYYY-MM-DD"),
  updated: z.string().optional().describe("YYYY-MM-DD"),
  status: z.enum(["draft", "final", "archived"]).optional(),
  source: z.string().optional().describe("origin URL for ingested material"),
  authors: z.array(z.string()).optional(),
  space: z.enum(["private", "shared"]).optional().describe("doc visibility: private (only you) or shared (both people). Defaults to private."),
};

export function createMcpServer(index: ArchiveIndex, identity: Identity): McpServer {
  const server = new McpServer({ name: "owl-library", version: "0.1.0" });

  async function freshIndex(): Promise<ArchiveIndex> {
    if (await index.needsRefresh()) {
      const n = await index.buildFromDisk();
      console.error(`[owl-library] index rebuilt: ${n} docs`);
    }
    return index;
  }

  function resolveSpace(raw: "private" | "shared" | undefined): DocSpace {
    return raw === "shared" ? "shared" : identity;
  }

  /** Visibility gate; docs the caller can't see are reported as NOT FOUND, same as the website. */
  async function canSee(rel: string): Promise<boolean> {
    const doc = await readDoc(rel);
    return visibleTo(doc.meta.space, identity);
  }

  const notFound = (): ReturnType<typeof fail> => fail("NOT FOUND: no such doc or folder");

  server.tool(
    "list_tree",
    "List the archive folder tree with doc titles, formats, and tags. Paths are relative to the content root.",
    {
      path: z.string().optional().describe("subfolder to list (default: root)"),
      depth: z.number().optional().describe("max depth (default: unlimited)"),
    },
    async ({ path, depth }) => {
      try {
        return ok(renderTree(filterTreeVisible(await buildTree(path ?? "", depth ?? Infinity), identity)));
      } catch (err) {
        return describeError(err);
      }
    },
  );

  server.tool(
    "read_doc",
    "Read a document: metadata, content, and contentHash. The hash is REQUIRED for update_doc/edit_doc. PDFs return metadata only.",
    { path: z.string().describe("e.g. notes/attention.md") },
    async ({ path }) => {
      try {
        const doc = await readDoc(path);
        if (!visibleTo(doc.meta.space, identity)) return notFound();
        return ok({ path: doc.path, format: doc.format, meta: doc.meta, contentHash: doc.contentHash, sizeBytes: doc.sizeBytes, content: doc.content });
      } catch (err) {
        return describeError(err);
      }
    },
  );

  server.tool(
    "create_doc",
    "Create a new .md or .html document. Fails if it already exists. For .md, meta is written as YAML frontmatter and content is the body. For .html, content must be a complete self-contained HTML file (metadata via <meta name=\"archive-*\"> tags). Parent folders are created automatically.",
    {
      path: z.string().describe("e.g. notes/new-idea.md"),
      content: z.string(),
      meta: z.object(metaShape).optional(),
    },
    async ({ path, content, meta }) => {
      try {
        const docMeta = { ...meta, space: resolveSpace(meta?.space) } as Partial<DocMeta>;
        const res = await createDoc(path, content, docMeta);
        await (await freshIndex()).upsert(res.path, { silent: true });
        return ok(`Created ${res.path}\ncontentHash: ${res.contentHash}`);
      } catch (err) {
        return describeError(err);
      }
    },
  );

  server.tool(
    "update_doc",
    "Replace a document's full content. Requires baseHash from a fresh read_doc — rejected with the current content if the file changed since (re-read, merge, retry). Returns a unified diff. For .md docs the 'updated' frontmatter date is bumped automatically.",
    {
      path: z.string(),
      content: z.string().describe("the COMPLETE new file content"),
      baseHash: z.string().describe("contentHash from read_doc"),
    },
    async ({ path, content, baseHash }) => {
      try {
        if (!(await canSee(path))) return notFound();
        const res = await updateDoc(path, content, baseHash);
        await (await freshIndex()).upsert(res.path, { silent: true });
        return ok(`Updated ${res.path}\nnew contentHash: ${res.contentHash}\n\n${res.diff}`);
      } catch (err) {
        return describeError(err);
      }
    },
  );

  server.tool(
    "edit_doc",
    "Apply targeted string-replacement edits to a document (preferred over update_doc for large files). Each oldText must appear exactly once. Requires baseHash from read_doc. Returns a unified diff.",
    {
      path: z.string(),
      edits: z.array(z.object({ oldText: z.string(), newText: z.string() })).min(1),
      baseHash: z.string().describe("contentHash from read_doc"),
    },
    async ({ path, edits, baseHash }) => {
      try {
        if (!(await canSee(path))) return notFound();
        const res = await editDoc(path, edits, baseHash);
        await (await freshIndex()).upsert(res.path, { silent: true });
        return ok(`Edited ${res.path} (${edits.length} edit${edits.length === 1 ? "" : "s"})\nnew contentHash: ${res.contentHash}\n\n${res.diff}`);
      } catch (err) {
        return describeError(err);
      }
    },
  );

  server.tool(
    "set_meta",
    "Merge partial metadata into a doc without touching its body. Works for all formats: .md frontmatter, .html meta tags, .pdf JSON sidecar.",
    { path: z.string(), meta: z.object(metaShape) },
    async ({ path, meta }) => {
      try {
        if (!(await canSee(path))) return notFound();
        // only include the space key when the caller set it — a bare undefined would wipe the stored value on merge
        const { space, ...rest } = meta;
        const partial = (space === undefined ? rest : { ...rest, space: resolveSpace(space) }) as Partial<DocMeta>;
        const merged = await writeMeta(path, partial);
        await (await freshIndex()).upsert(path, { silent: true });
        return ok({ path, meta: merged });
      } catch (err) {
        return describeError(err);
      }
    },
  );

  server.tool(
    "delete_node",
    "Soft-delete a doc or folder: it is MOVED into content/.trash (never permanently deleted). Restore it later with move_node from the returned trash path.",
    { path: z.string() },
    async ({ path }) => {
      try {
        if (formatOf(path) && !(await canSee(path))) return notFound();
        const res = await deleteToTrash(path);
        (await freshIndex()).remove(path);
        return ok(`Trashed ${path} → ${res.trashedTo}\nRestore with move_node if this was a mistake.`);
      } catch (err) {
        return describeError(err);
      }
    },
  );

  server.tool(
    "move_node",
    "Move or rename a doc or folder. Fails if the destination exists. PDF metadata sidecars move along automatically. Also restores items from .trash.",
    { from: z.string(), to: z.string() },
    async ({ from, to }) => {
      try {
        if (formatOf(from) && !(await canSee(from))) return notFound();
        const res = await moveNode(from, to);
        const idx = await freshIndex();
        idx.remove(res.from);
        await idx.upsert(res.to, { silent: true });
        return ok(`Moved ${res.from} → ${res.to}`);
      } catch (err) {
        return describeError(err);
      }
    },
  );

  server.tool(
    "create_folder",
    "Create a folder (mkdir -p semantics).",
    { path: z.string() },
    async ({ path }) => {
      try {
        return ok(`Created folder ${(await createFolder(path)).path}/`);
      } catch (err) {
        return describeError(err);
      }
    },
  );

  server.tool(
    "search",
    "Full-text search across the archive (titles, tags, headings, body of .md/.html; PDF sidecar metadata). Returns paths, titles, tags, and snippets.",
    {
      query: z.string(),
      tags: z.array(z.string()).optional().describe("require ALL of these tags"),
      folder: z.string().optional().describe("restrict to a subfolder"),
      limit: z.number().optional().describe("default 10"),
    },
    async ({ query, tags, folder, limit }) => {
      try {
        const hits = (await freshIndex()).query(query, { tags, folder, limit, spaces: [identity, "shared"] });
        if (!hits.length) return ok("No results.");
        return ok(hits);
      } catch (err) {
        return describeError(err);
      }
    },
  );

  server.tool(
    "list_tags",
    "List all tags in use with doc counts. Check this before tagging to keep tags consistent.",
    {},
    async () => {
      try {
        return ok((await freshIndex()).listTags([identity, "shared"]));
      } catch (err) {
        return describeError(err);
      }
    },
  );

  return server;
}
