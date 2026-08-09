import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { readDoc, updateDoc, createDoc, moveNode, createFolder, ConflictError } from "../../core/docs.js";
import { buildTree, filterTreeVisible } from "../../core/tree.js";
import { ArchiveIndex } from "../../core/search.js";
import { PathError } from "../../core/paths.js";
import { formatOf } from "../../core/config.js";
import { Identity, visibleTo, writeMeta, type DocMeta, type DocSpace } from "../../core/meta.js";
import { currentIdentity } from "../auth.js";
import { organizeNotesDoc } from "../organize.js";

function sendError(reply: FastifyReply, err: unknown): FastifyReply {
  if (err instanceof ConflictError) return reply.code(409).send({ error: "conflict" });
  if (err instanceof PathError) return reply.code(400).send({ error: err.message });
  if ((err as NodeJS.ErrnoException).code === "ENOENT") return reply.code(404).send({ error: "not found" });
  if (err instanceof Error) return reply.code(500).send({ error: err.message });
  throw err;
}

function identityOf(req: FastifyRequest): Identity {
  const id = currentIdentity(req);
  if (!id) throw new Error("unreachable: auth preHandler guarantees identity on api routes");
  return id;
}

/** Browser sends "private"/"shared"; resolve to a concrete DocSpace for this person. */
function resolveSpace(raw: unknown, identity: Identity): DocSpace | null {
  if (raw === undefined || raw === "private") return identity;
  if (raw === "shared") return "shared";
  if (raw === identity) return identity;
  return null;
}

/** True if this person may see the doc at rel; ENOENT/path errors bubble up. */
async function canSee(rel: string, identity: Identity): Promise<boolean> {
  const doc = await readDoc(rel);
  return visibleTo(doc.meta.space, identity);
}

export function registerApiRoutes(app: FastifyInstance, index: ArchiveIndex): void {
  app.get<{ Querystring: { q?: string; tags?: string; folder?: string; limit?: string } }>(
    "/api/search",
    async (req) => {
      const identity = identityOf(req);
      const { q = "", tags, folder, limit } = req.query;
      if (!q.trim()) return { hits: [] };
      return {
        hits: index.query(q, {
          tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
          folder: folder || undefined,
          limit: limit ? Number(limit) : undefined,
          spaces: [identity, "shared"],
        }),
      };
    },
  );

  app.get<{ Querystring: { path?: string; depth?: string } }>("/api/tree", async (req) => {
    const identity = identityOf(req);
    return filterTreeVisible(
      await buildTree(req.query.path ?? "", req.query.depth ? Number(req.query.depth) : Infinity),
      identity,
    );
  });

  app.get<{ Querystring: { path?: string } }>("/api/doc", async (req, reply) => {
    const identity = identityOf(req);
    const rel = req.query.path;
    if (!rel) return reply.code(400).send({ error: "path required" });
    try {
      const doc = await readDoc(rel);
      if (!visibleTo(doc.meta.space, identity)) return reply.code(404).send({ error: "not found" });
      return { path: doc.path, format: doc.format, meta: doc.meta, content: doc.content, hash: doc.contentHash };
    } catch (err) {
      if (err instanceof PathError) return reply.code(400).send({ error: err.message });
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return reply.code(404).send({ error: "not found" });
      throw err;
    }
  });

  app.put<{ Body: { path?: string; content?: string; baseHash?: string } }>("/api/doc", async (req, reply) => {
    const identity = identityOf(req);
    const { path: rel, content, baseHash } = req.body ?? {};
    if (!rel || typeof content !== "string" || !baseHash) {
      return reply.code(400).send({ error: "path, content, baseHash required" });
    }
    try {
      if (!(await canSee(rel, identity))) return reply.code(404).send({ error: "not found" });
      const res = await updateDoc(rel, content, baseHash);
      await index.upsert(res.path);
      return { hash: res.contentHash };
    } catch (err) {
      if (err instanceof ConflictError) {
        return reply.code(409).send({ error: "conflict", current: err.currentContent, hash: err.currentHash });
      }
      if (err instanceof PathError) return reply.code(400).send({ error: err.message });
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return reply.code(404).send({ error: "not found" });
      throw err;
    }
  });

  app.post<{ Body: { path?: string; content?: string; meta?: Record<string, unknown> } }>(
    "/api/create",
    async (req, reply) => {
      const identity = identityOf(req);
      const { path: rel, content = "", meta } = req.body ?? {};
      if (!rel) return reply.code(400).send({ error: "path required" });
      const space = resolveSpace(meta?.space, identity);
      if (!space) return reply.code(400).send({ error: 'space must be "private" or "shared"' });
      try {
        const res = await createDoc(rel, content, { ...meta, space } as Partial<DocMeta>);
        await index.upsert(res.path);
        return res;
      } catch (err) {
        return sendError(reply, err);
      }
    },
  );

  // toggle a doc between this person's private space and shared
  app.post<{ Body: { path?: string; space?: string } }>("/api/space", async (req, reply) => {
    const identity = identityOf(req);
    const rel = req.body?.path;
    if (!rel) return reply.code(400).send({ error: "path required" });
    const space = resolveSpace(req.body?.space, identity);
    if (!space) return reply.code(400).send({ error: 'space must be "private" or "shared"' });
    try {
      if (!(await canSee(rel, identity))) return reply.code(404).send({ error: "not found" });
      const meta = await writeMeta(rel, { space });
      await index.upsert(rel);
      return { path: rel, space: meta.space };
    } catch (err) {
      return sendError(reply, err);
    }
  });

  app.post<{ Body: { path?: string } }>("/api/folder", async (req, reply) => {
    const rel = req.body?.path;
    if (!rel) return reply.code(400).send({ error: "path required" });
    try {
      return await createFolder(rel);
    } catch (err) {
      return sendError(reply, err);
    }
  });

  app.post<{ Body: { from?: string; to?: string } }>("/api/move", async (req, reply) => {
    const identity = identityOf(req);
    const { from, to } = req.body ?? {};
    if (!from || !to) return reply.code(400).send({ error: "from, to required" });
    try {
      // docs are gated by visibility; folders are shared structure and move freely
      if (formatOf(from) && !(await canSee(from, identity))) {
        return reply.code(404).send({ error: "not found" });
      }
      const res = await moveNode(from, to);
      // docs: reindex immediately; folder moves are picked up file-by-file by the watcher
      if (formatOf(res.to)) {
        index.remove(res.from);
        await index.upsert(res.to);
      }
      return res;
    } catch (err) {
      return sendError(reply, err);
    }
  });

  app.post<{ Body: { path?: string } }>("/api/organize", async (req, reply) => {
    const identity = identityOf(req);
    const rel = req.body?.path;
    if (!rel) return reply.code(400).send({ error: "path required" });
    try {
      if (!(await canSee(rel, identity))) return reply.code(404).send({ error: "not found" });
      const res = await organizeNotesDoc(rel);
      await index.upsert(res.path);
      return res;
    } catch (err) {
      return sendError(reply, err);
    }
  });
}
