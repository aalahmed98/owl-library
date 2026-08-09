import type { FastifyInstance, FastifyRequest } from "fastify";
import { readDoc } from "../../core/docs.js";
import { buildTree, collectDocs, collectFolders, filterTreeVisible } from "../../core/tree.js";
import { ArchiveIndex } from "../../core/search.js";
import { PathError } from "../../core/paths.js";
import { Identity, visibleTo } from "../../core/meta.js";
import { renderMarkdown } from "../markdown.js";
import { renderSidebarTree } from "../render/tree.js";
import { currentIdentity } from "../auth.js";
import {
  homePage, folderPage, markdownDocPage, htmlDocPage, pdfDocPage,
  searchPage, editPage, newDocPage, errorPage,
} from "../render/pages.js";

const RECENT_COUNT = 10;

function identityOf(req: FastifyRequest): Identity {
  const id = currentIdentity(req);
  if (!id) throw new Error("unreachable: auth preHandler guarantees identity on page routes");
  return id;
}

async function sidebarFor(identity: Identity, activePath = ""): Promise<string> {
  return renderSidebarTree(filterTreeVisible(await buildTree(), identity), activePath);
}

function byRecency<T extends { created?: string; modified: string }>(a: T, b: T): number {
  const ka = a.created ?? a.modified;
  const kb = b.created ?? b.modified;
  return kb === ka ? b.modified.localeCompare(a.modified) : kb.localeCompare(ka);
}

export function registerPageRoutes(app: FastifyInstance, index: ArchiveIndex): void {
  app.get("/", async (req, reply) => {
    const identity = identityOf(req);
    const root = filterTreeVisible(await buildTree(), identity);
    const docs = collectDocs(root).sort(byRecency);
    const shared = docs.filter((d) => d.space === "shared").slice(0, RECENT_COUNT);
    const personal = docs.filter((d) => d.space === identity).slice(0, RECENT_COUNT);
    reply.type("text/html");
    return homePage(renderSidebarTree(root), root, index.listTags([identity, "shared"]), shared, personal, identity);
  });

  app.get<{ Querystring: { folder?: string } }>("/new", async (req, reply) => {
    const identity = identityOf(req);
    const root = filterTreeVisible(await buildTree(), identity);
    const folders = collectFolders(root);
    const requested = req.query.folder ?? "";
    const initial = folders.includes(requested) ? requested : folders.includes("notes") ? "notes" : "";
    reply.type("text/html");
    return newDocPage(renderSidebarTree(root), folders, initial, identity);
  });

  app.get<{ Params: { "*": string } }>("/folder/*", async (req, reply) => {
    const identity = identityOf(req);
    reply.type("text/html");
    try {
      const folder = filterTreeVisible(await buildTree(req.params["*"]), identity);
      return folderPage(await sidebarFor(identity), folder, identity);
    } catch {
      return reply.code(404).send(errorPage(await sidebarFor(identity), 404, "Folder not found.", identity));
    }
  });

  app.get<{ Params: { "*": string } }>("/doc/*", async (req, reply) => {
    const identity = identityOf(req);
    const rel = req.params["*"];
    reply.type("text/html");
    try {
      const doc = await readDoc(rel);
      if (!visibleTo(doc.meta.space, identity)) {
        return reply.code(404).send(errorPage(await sidebarFor(identity), 404, `No document at ${rel}`, identity));
      }
      const sidebar = await sidebarFor(identity, doc.path);
      if (doc.format === "md") {
        const { html, toc } = await renderMarkdown(doc.content);
        return markdownDocPage(sidebar, doc, html, toc, identity);
      }
      if (doc.format === "html") return htmlDocPage(sidebar, doc, identity);
      return pdfDocPage(sidebar, doc, identity);
    } catch (err) {
      if (err instanceof PathError) {
        return reply.code(400).send(errorPage(await sidebarFor(identity), 400, err.message, identity));
      }
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return reply.code(404).send(errorPage(await sidebarFor(identity), 404, `No document at ${rel}`, identity));
      }
      throw err;
    }
  });

  app.get<{ Params: { "*": string } }>("/edit/*", async (req, reply) => {
    const identity = identityOf(req);
    const rel = req.params["*"];
    reply.type("text/html");
    try {
      const doc = await readDoc(rel);
      if (!visibleTo(doc.meta.space, identity)) {
        return reply.code(404).send(errorPage(await sidebarFor(identity), 404, `No document at ${rel}`, identity));
      }
      if (doc.format !== "md") {
        return reply.code(400).send(errorPage(await sidebarFor(identity), 400, "Only markdown docs are editable in the browser.", identity));
      }
      return editPage(await sidebarFor(identity, doc.path), doc, identity);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return reply.code(404).send(errorPage(await sidebarFor(identity), 404, `No document at ${rel}`, identity));
      }
      throw err;
    }
  });

  app.get<{ Querystring: { q?: string } }>("/search", async (req, reply) => {
    const identity = identityOf(req);
    const q = (req.query.q ?? "").trim();
    reply.type("text/html");
    return searchPage(
      await sidebarFor(identity),
      q,
      q ? index.query(q, { limit: 50, spaces: [identity, "shared"] }) : [],
      identity,
    );
  });
}
