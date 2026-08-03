import { DocRead } from "../../core/docs.js";
import { FolderNode, DocNode } from "../../core/tree.js";
import { SearchHit } from "../../core/search.js";
import { TocEntry } from "../markdown.js";
import { esc, layout } from "./layout.js";

const FORMAT_LABEL: Record<string, string> = { md: "Markdown", html: "Interactive", pdf: "PDF" };

function tagChips(tags: string[]): string {
  if (!tags.length) return "";
  return `<span class="tag-chips">${tags
    .map((t) => `<a class="tag-chip" href="/search?q=${encodeURIComponent(t)}">${esc(t)}</a>`)
    .join("")}</span>`;
}

function breadcrumbs(relPath: string): string {
  const parts = relPath.split("/").filter(Boolean);
  let acc = "";
  const links = parts.slice(0, -1).map((p) => {
    acc += (acc ? "/" : "") + p;
    return `<a href="/folder/${encodeURI(acc)}">${esc(p)}</a>`;
  });
  return `<nav class="breadcrumbs"><a href="/">archive</a>${links.map((l) => " / " + l).join("")}</nav>`;
}

export function homePage(sidebar: string, root: FolderNode, tagList: { tag: string; count: number }[]): string {
  return layout({
    title: "Home",
    sidebar,
    content: `
<h1>theArchive</h1>
<p class="muted">Personal library of docs, notes, and research papers.</p>
${folderCards(root)}
<h2>Tags</h2>
<p>${tagList.map((t) => `<a class="tag-chip" href="/search?q=${encodeURIComponent(t.tag)}">${esc(t.tag)} <span class="muted">${t.count}</span></a>`).join(" ") || '<span class="muted">No tags yet.</span>'}</p>`,
  });
}

function folderCards(folder: FolderNode): string {
  const docs = folder.children.filter((c): c is DocNode => c.kind === "doc");
  const subs = folder.children.filter((c): c is FolderNode => c.kind === "folder");
  const subCards = subs
    .map(
      (s) => `<a class="card card-folder" href="/folder/${encodeURI(s.path)}">
<h3>📁 ${esc(s.name)}</h3>
<p class="muted">${s.children.length} item${s.children.length === 1 ? "" : "s"}</p>
</a>`,
    )
    .join("\n");
  const docCards = docs
    .map(
      (d) => `<a class="card" href="/doc/${encodeURI(d.path)}">
<h3>${esc(d.title)}</h3>
<p class="doc-card-meta"><span class="badge badge-${d.format}">${FORMAT_LABEL[d.format]}</span>${d.status ? ` <span class="badge">${esc(d.status)}</span>` : ""}</p>
${d.summary ? `<p class="muted">${esc(d.summary)}</p>` : ""}
${d.tags.length ? `<p class="muted small">${d.tags.map(esc).join(" · ")}</p>` : ""}
</a>`,
    )
    .join("\n");
  return `<div class="cards">\n${subCards}\n${docCards}\n</div>`;
}

export function folderPage(sidebar: string, folder: FolderNode): string {
  return layout({
    title: folder.name,
    sidebar,
    content: `
${breadcrumbs(folder.path + "/x")}
<h1>📁 ${esc(folder.name)}</h1>
${folderCards(folder)}`,
  });
}

function docHeader(doc: DocRead, actions: string): string {
  return `${breadcrumbs(doc.path)}
<div class="doc-header">
  <h1 class="doc-title">${esc(doc.meta.title)}</h1>
  <div class="doc-actions">${actions}</div>
</div>
<p class="doc-meta">
  <span class="badge badge-${doc.format}">${FORMAT_LABEL[doc.format]}</span>
  ${doc.meta.status ? `<span class="badge">${esc(doc.meta.status)}</span>` : ""}
  ${doc.meta.updated ? `<span class="muted">updated ${esc(doc.meta.updated)}</span>` : ""}
  ${tagChips(doc.meta.tags)}
  ${doc.meta.source ? `<a class="muted small" href="${esc(doc.meta.source)}" target="_blank" rel="noopener">source ↗</a>` : ""}
</p>
${doc.meta.summary ? `<p class="doc-summary">${esc(doc.meta.summary)}</p>` : ""}`;
}

export function markdownDocPage(sidebar: string, doc: DocRead, html: string, toc: TocEntry[]): string {
  const rail = toc.length
    ? `<div class="toc"><p class="toc-title">On this page</p>
${toc.map((t) => `<a class="toc-link toc-d${t.depth}" href="#${esc(t.id)}">${esc(t.text)}</a>`).join("\n")}
</div>`
    : undefined;
  return layout({
    title: doc.meta.title,
    sidebar,
    rail,
    content: `${docHeader(doc, `<a class="btn" href="/edit/${encodeURI(doc.path)}">Edit</a>`)}
<article class="prose">
${html}
</article>`,
  });
}

export function htmlDocPage(sidebar: string, doc: DocRead): string {
  const raw = `/raw/${encodeURI(doc.path)}`;
  return layout({
    title: doc.meta.title,
    sidebar,
    content: `${docHeader(doc, `<a class="btn" href="${raw}" target="_blank" rel="noopener">Open raw ↗</a>`)}
<iframe class="paper-frame" sandbox="allow-scripts" src="${raw}" title="${esc(doc.meta.title)}"></iframe>`,
  });
}

export function pdfDocPage(sidebar: string, doc: DocRead): string {
  const raw = `/raw/${encodeURI(doc.path)}`;
  return layout({
    title: doc.meta.title,
    sidebar,
    content: `${docHeader(doc, `<a class="btn" href="${raw}" target="_blank" rel="noopener">Open raw ↗</a>`)}
<iframe class="pdf-frame" src="${raw}" title="${esc(doc.meta.title)}"></iframe>`,
  });
}

export function searchPage(sidebar: string, query: string, hits: SearchHit[]): string {
  return layout({
    title: query ? `Search: ${query}` : "Search",
    sidebar,
    content: `
<h1>Search</h1>
<form method="get" action="/search" class="search-form">
  <input name="q" type="search" value="${esc(query)}" placeholder="Search the archive…" autofocus>
  <button class="btn" type="submit">Search</button>
</form>
${
  query
    ? hits.length
      ? `<p class="muted">${hits.length} result${hits.length === 1 ? "" : "s"}</p>
<div class="results">${hits
          .map(
            (h) => `<a class="result" href="/doc/${encodeURI(h.path)}">
<h3>${esc(h.title)} <span class="badge badge-${h.format}">${FORMAT_LABEL[h.format] ?? h.format}</span></h3>
<p class="muted small">${esc(h.path)}</p>
<p>${esc(h.snippet)}</p>
${h.tags.length ? `<p class="muted small">${h.tags.map(esc).join(" · ")}</p>` : ""}
</a>`,
          )
          .join("\n")}</div>`
      : `<p class="muted">No results for “${esc(query)}”.</p>`
    : ""
}`,
  });
}

export function editPage(sidebar: string, doc: DocRead): string {
  return layout({
    title: `Edit: ${doc.meta.title}`,
    sidebar,
    content: `${breadcrumbs(doc.path)}
<div class="doc-header">
  <h1 class="doc-title">Editing ${esc(doc.meta.title)}</h1>
  <div class="doc-actions">
    <span id="editor-status" class="muted"></span>
    <button id="editor-save" class="btn btn-primary">Save</button>
    <a class="btn" href="/doc/${encodeURI(doc.path)}">View</a>
  </div>
</div>
<div id="editor-conflict" class="banner banner-warn" hidden>
  This file changed on disk since you opened it. <button id="editor-reload" class="btn">Reload latest</button>
</div>
<div id="editor" class="editor-host" data-path="${esc(doc.path)}"></div>`,
    scripts: `<script src="/assets/js/editor.js"></script>`,
  });
}

export function errorPage(sidebar: string, status: number, message: string): string {
  return layout({
    title: `${status}`,
    sidebar,
    content: `<h1>${status}</h1><p>${esc(message)}</p><p><a href="/">← back to the archive</a></p>`,
  });
}
