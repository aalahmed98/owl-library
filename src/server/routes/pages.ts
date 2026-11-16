import type { FastifyInstance, FastifyRequest } from "fastify";
import { readDoc } from "../../core/docs.js";
import { buildTree, collectDocs, collectFolders } from "../../core/tree.js";
import { ArchiveIndex } from "../../core/search.js";
import { PathError } from "../../core/paths.js";
import type { Role } from "../../core/role.js";
import { renderMarkdown } from "../markdown.js";
import { renderSidebarTree } from "../render/tree.js";
import { currentRole } from "../auth.js";
import {
  homePage, folderPage, markdownDocPage, htmlDocPage, pdfDocPage,
  searchPage, editPage, newDocPage, errorPage,
} from "../render/pages.js";

const RECENT_COUNT = 10;

function roleOf(req: FastifyRequest): Role {
  const role = currentRole(req);
  if (!role) throw new Error("unreachable: auth preHandler guarantees a session on page routes");
  return role;
}

async function sidebarFor(activePath = ""): Promise<string> {
  return renderSidebarTree(await buildTree(), activePath);
}

function byRecency<T extends { created?: string; modified: string }>(a: T, b: T): number {
  const ka = a.created ?? a.modified;
  const kb = b.created ?? b.modified;
  return kb === ka ? b.modified.localeCompare(a.modified) : kb.localeCompare(ka);
}

export function registerPageRoutes(app: FastifyInstance, index: ArchiveIndex): void {
  app.get("/", async (req, reply) => {
    const role = roleOf(req);
    const root = await buildTree();
    const recent = collectDocs(root).sort(byRecency).slice(0, RECENT_COUNT);
    reply.type("text/html");
    return homePage(renderSidebarTree(root), root, index.listTags(), recent, role);
  });

  // admin only: the auth preHandler redirects guests away from /new and /edit/*
  app.get<{ Querystring: { folder?: string } }>("/new", async (req, reply) => {
    const role = roleOf(req);
    const root = await buildTree();
    const folders = collectFolders(root);
    const requested = req.query.folder ?? "";
    const initial = folders.includes(requested) ? requested : folders.includes("notes") ? "notes" : "";
    reply.type("text/html");
    return newDocPage(renderSidebarTree(root), folders, initial, role);
  });

  app.get<{ Params: { "*": string } }>("/folder/*", async (req, reply) => {
    const role = roleOf(req);
    reply.type("text/html");
    try {
      const folder = await buildTree(req.params["*"]);
      return folderPage(await sidebarFor(), folder, role);
    } catch {
      return reply.code(404).send(errorPage(await sidebarFor(), 404, "Folder not found.", role));
    }
  });

  app.get<{ Params: { "*": string } }>("/doc/*", async (req, reply) => {
    const role = roleOf(req);
    const rel = req.params["*"];
    reply.type("text/html");
    try {
      const doc = await readDoc(rel);
      const sidebar = await sidebarFor(doc.path);
      if (doc.format === "md") {
        const { html, toc } = await renderMarkdown(doc.content);
        return markdownDocPage(sidebar, doc, html, toc, role);
      }
      if (doc.format === "html") return htmlDocPage(sidebar, doc, role);
      return pdfDocPage(sidebar, doc, role);
    } catch (err) {
      if (err instanceof PathError) {
        return reply.code(400).send(errorPage(await sidebarFor(), 400, err.message, role));
      }
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return reply.code(404).send(errorPage(await sidebarFor(), 404, `No document at ${rel}`, role));
      }
      throw err;
    }
  });

  app.get<{ Params: { "*": string } }>("/edit/*", async (req, reply) => {
    const role = roleOf(req);
    const rel = req.params["*"];
    reply.type("text/html");
    try {
      const doc = await readDoc(rel);
      if (doc.format !== "md") {
        return reply.code(400).send(errorPage(await sidebarFor(), 400, "Only markdown docs are editable in the browser.", role));
      }
      return editPage(await sidebarFor(doc.path), doc, role);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return reply.code(404).send(errorPage(await sidebarFor(), 404, `No document at ${rel}`, role));
      }
      throw err;
    }
  });

  app.get<{ Querystring: { q?: string } }>("/search", async (req, reply) => {
    const role = roleOf(req);
    const q = (req.query.q ?? "").trim();
    reply.type("text/html");
    return searchPage(await sidebarFor(), q, q ? index.query(q, { limit: 50 }) : [], role);
  });
}
