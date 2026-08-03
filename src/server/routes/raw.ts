import type { FastifyInstance } from "fastify";
import fs from "node:fs";
import path from "node:path";
import { resolveContentPath, isInTrash, PathError, toRelPath } from "../../core/paths.js";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".json": "application/json; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

export function registerRawRoutes(app: FastifyInstance): void {
  app.get<{ Params: { "*": string } }>("/raw/*", async (req, reply) => {
    const rel = req.params["*"];
    let abs: string;
    try {
      abs = resolveContentPath(rel);
    } catch (err) {
      if (err instanceof PathError) return reply.code(400).send("bad path");
      throw err;
    }
    if (isInTrash(toRelPath(abs))) return reply.code(404).send("not found");
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return reply.code(404).send("not found");
    const mime = MIME[path.extname(abs).toLowerCase()] ?? "application/octet-stream";
    reply.header("content-type", mime);
    // belt & braces alongside the iframe sandbox attribute
    reply.header("x-content-type-options", "nosniff");
    return reply.send(fs.createReadStream(abs));
  });
}
