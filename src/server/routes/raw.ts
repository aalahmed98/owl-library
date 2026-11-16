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

/**
 * Added to an interactive doc only when the site frames it (`?embed=1`). It
 * asks the parent page for the site's theme and sets it as `data-theme` on the
 * doc's root, then keeps listening so the doc switches when the site does. The
 * doc is untouched on disk, and opening it on its own leaves it following the
 * browser's own light/dark setting.
 */
const THEME_SYNC = `<script>(function(){function a(t){if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}addEventListener("message",function(e){var d=e.data;if(d&&d.type==="owl-theme")a(d.theme)});try{if(parent!==window)parent.postMessage({type:"owl-theme-request"},"*")}catch(e){}})();</script>`;

// Readable by any signed-in session (admin or guest); the auth preHandler
// has already turned away anyone who is not signed in.
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
    const ext = path.extname(abs).toLowerCase();
    const mime = MIME[ext] ?? "application/octet-stream";
    reply.header("content-type", mime);
    // belt & braces alongside the iframe sandbox attribute
    reply.header("x-content-type-options", "nosniff");
    // an HTML doc is someone's page, not part of the site: this keeps its scripts out of the
    // site's origin (cookies, API) even when it is opened directly in a tab
    if (ext === ".html" || ext === ".htm") {
      reply.header("content-security-policy", "sandbox allow-scripts allow-popups allow-forms allow-modals allow-downloads");
    }
    // shown inside the site's frame: add the theme listener so the doc follows the site's light/dark switch
    if ((ext === ".html" || ext === ".htm") && (req.query as { embed?: string }).embed === "1") {
      const src = await fs.promises.readFile(abs, "utf8");
      const at = src.search(/<\/head>/i);
      return reply.send(at === -1 ? THEME_SYNC + src : src.slice(0, at) + THEME_SYNC + src.slice(at));
    }
    return reply.send(fs.createReadStream(abs));
  });
}
