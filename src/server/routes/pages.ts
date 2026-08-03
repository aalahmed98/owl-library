import type { FastifyInstance } from "fastify";
import fs from "node:fs";
import { readDoc } from "../../core/docs.js";
import { buildTree } from "../../core/tree.js";
import { ArchiveIndex } from "../../core/search.js";
import { PathError, resolveContentPath } from "../../core/paths.js";
import { renderMarkdown } from "../markdown.js";
import { renderSidebarTree } from "../render/tree.js";
import {
  homePage, folderPage, markdownDocPage, htmlDocPage, pdfDocPage,
  searchPage, editPage, errorPage,
} from "../render/pages.js";

async function sidebarFor(activePath = ""): Promise<string> {
  return renderSidebarTree(await buildTree(), activePath);
}

export function registerPageRoutes(app: FastifyInstance, index: ArchiveIndex): void {
  app.get("/", async (_req, reply) => {
    const root = await buildTree();
    reply.type("text/html");
    return homePage(renderSidebarTree(root), root, index.listTags());
  });

  app.get<{ Params: { "*": string } }>("/folder/*", async (req, reply) => {
    reply.type("text/html");
    try {
      const folder = await buildTree(req.params["*"]);
      return folderPage(await sidebarFor(), folder);
    } catch {
      return reply.code(404).send(errorPage(await sidebarFor(), 404, "Folder not found."));
    }
  });

  app.get<{ Params: { "*": string } }>("/doc/*", async (req, reply) => {
    const rel = req.params["*"];
    reply.type("text/html");
    try {
      const doc = await readDoc(rel);
      const sidebar = await sidebarFor(doc.path);
      if (doc.format === "md") {
        const { html, toc } = await renderMarkdown(doc.content);
        return markdownDocPage(sidebar, doc, html, toc);
      }
      if (doc.format === "html") return htmlDocPage(sidebar, doc);
      return pdfDocPage(sidebar, doc);
    } catch (err) {
      if (err instanceof PathError) {
        return reply.code(400).send(errorPage(await sidebarFor(), 400, err.message));
      }
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return reply.code(404).send(errorPage(await sidebarFor(), 404, `No document at ${rel}`));
      }
      throw err;
    }
  });

  app.get<{ Params: { "*": string } }>("/edit/*", async (req, reply) => {
    const rel = req.params["*"];
    reply.type("text/html");
    try {
      const doc = await readDoc(rel);
      if (doc.format !== "md") {
        return reply.code(400).send(errorPage(await sidebarFor(), 400, "Only markdown docs are editable in the browser."));
      }
      return editPage(await sidebarFor(doc.path), doc);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return reply.code(404).send(errorPage(await sidebarFor(), 404, `No document at ${rel}`));
      }
      throw err;
    }
  });

  app.get<{ Querystring: { q?: string } }>("/search", async (req, reply) => {
    const q = (req.query.q ?? "").trim();
    reply.type("text/html");
    return searchPage(await sidebarFor(), q, q ? index.query(q, { limit: 50 }) : []);
  });
}
