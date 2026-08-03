import type { FastifyInstance } from "fastify";
import { readDoc, updateDoc, ConflictError } from "../../core/docs.js";
import { buildTree } from "../../core/tree.js";
import { ArchiveIndex } from "../../core/search.js";
import { PathError } from "../../core/paths.js";

export function registerApiRoutes(app: FastifyInstance, index: ArchiveIndex): void {
  app.get<{ Querystring: { q?: string; tags?: string; folder?: string; limit?: string } }>(
    "/api/search",
    async (req) => {
      const { q = "", tags, folder, limit } = req.query;
      if (!q.trim()) return { hits: [] };
      return {
        hits: index.query(q, {
          tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
          folder: folder || undefined,
          limit: limit ? Number(limit) : undefined,
        }),
      };
    },
  );

  app.get<{ Querystring: { path?: string; depth?: string } }>("/api/tree", async (req) => {
    return buildTree(req.query.path ?? "", req.query.depth ? Number(req.query.depth) : Infinity);
  });

  app.get<{ Querystring: { path?: string } }>("/api/doc", async (req, reply) => {
    const rel = req.query.path;
    if (!rel) return reply.code(400).send({ error: "path required" });
    try {
      const doc = await readDoc(rel);
      return { path: doc.path, format: doc.format, meta: doc.meta, content: doc.content, hash: doc.contentHash };
    } catch (err) {
      if (err instanceof PathError) return reply.code(400).send({ error: err.message });
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return reply.code(404).send({ error: "not found" });
      throw err;
    }
  });

  app.put<{ Body: { path?: string; content?: string; baseHash?: string } }>("/api/doc", async (req, reply) => {
    const { path: rel, content, baseHash } = req.body ?? {};
    if (!rel || typeof content !== "string" || !baseHash) {
      return reply.code(400).send({ error: "path, content, baseHash required" });
    }
    try {
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
}
