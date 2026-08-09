import { DocRead } from "../../core/docs.js";
import { FolderNode, DocNode } from "../../core/tree.js";
import { SearchHit } from "../../core/search.js";
import { TocEntry } from "../markdown.js";
import { isRawNotesDoc } from "../organize.js";
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

function recentList(recent: DocNode[]): string {
  if (!recent.length) return '<p class="muted">No documents yet.</p>';
  return `<div class="recent-list">${recent
    .map(
      (d) => `<a class="recent-item" href="/doc/${encodeURI(d.path)}">
<span class="recent-main"><span class="recent-title">${esc(d.title)}</span> <span class="badge badge-${d.format}">${FORMAT_LABEL[d.format]}</span><br><span class="muted small">${esc(d.path)}</span></span>
<span class="recent-date" title="${d.created ? "created" : "modified"}">${esc(d.created ?? d.modified)}</span>
</a>`,
    )
    .join("\n")}</div>`;
}

export function homePage(
  sidebar: string,
  root: FolderNode,
  tagList: { tag: string; count: number }[],
  recent: DocNode[],
): string {
  return layout({
    title: "Home",
    sidebar,
    content: `
<div class="page-head">
  <h1>Owl Library</h1>
  <div class="doc-actions">
    <a class="btn btn-primary" href="/new">＋ New doc</a>
    <button class="btn js-newfolder" data-parent="">＋ New folder</button>
  </div>
</div>
<p class="muted">Personal library of docs, notes, and research papers.</p>
<h2>Recent</h2>
${recentList(recent)}
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
<div class="page-head">
  <h1>📁 ${esc(folder.name)}</h1>
  <div class="doc-actions">
    <a class="btn btn-primary" href="/new?folder=${encodeURIComponent(folder.path)}">＋ New doc</a>
    <button class="btn js-newfolder" data-parent="${esc(folder.path)}">＋ New folder</button>
    <button class="btn js-move" data-path="${esc(folder.path)}" data-kind="folder">Move…</button>
    <button class="btn js-rename" data-path="${esc(folder.path)}" data-kind="folder">Rename</button>
  </div>
</div>
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

const fullscreenBtn = `<button id="fullscreen-btn" class="btn" title="Fullscreen (f)">⛶ Fullscreen</button>`;

function nodeActions(relPath: string, kind: "doc" | "folder"): string {
  return `<button class="btn js-move" data-path="${esc(relPath)}" data-kind="${kind}">Move…</button><button class="btn js-rename" data-path="${esc(relPath)}" data-kind="${kind}">Rename</button>`;
}

export function markdownDocPage(sidebar: string, doc: DocRead, html: string, toc: TocEntry[]): string {
  const rail = toc.length
    ? `<div class="toc"><p class="toc-title">On this page</p>
${toc.map((t) => `<a class="toc-link toc-d${t.depth}" href="#${esc(t.id)}">${esc(t.text)}</a>`).join("\n")}
</div>`
    : undefined;
  const organizeBtn = isRawNotesDoc(doc.content)
    ? `<button class="btn btn-primary js-organize" data-path="${esc(doc.path)}" title="Organize these raw notes with AI">✨ Organize</button>`
    : "";
  return layout({
    title: doc.meta.title,
    sidebar,
    rail,
    content: `${docHeader(doc, `${organizeBtn}${fullscreenBtn}${nodeActions(doc.path, "doc")}<a class="btn" href="/edit/${encodeURI(doc.path)}">Edit</a>`)}
<div id="doc-view" class="doc-view">
<article class="prose">
${html}
</article>
</div>`,
  });
}

export function htmlDocPage(sidebar: string, doc: DocRead): string {
  const raw = `/raw/${encodeURI(doc.path)}`;
  return layout({
    title: doc.meta.title,
    sidebar,
    content: `${docHeader(doc, `${fullscreenBtn}${nodeActions(doc.path, "doc")}<a class="btn" href="${raw}" target="_blank" rel="noopener">Open raw ↗</a>`)}
<iframe id="doc-view" class="paper-frame" sandbox="allow-scripts" src="${raw}" title="${esc(doc.meta.title)}"></iframe>`,
  });
}

export function pdfDocPage(sidebar: string, doc: DocRead): string {
  const raw = `/raw/${encodeURI(doc.path)}`;
  return layout({
    title: doc.meta.title,
    sidebar,
    content: `${docHeader(doc, `${fullscreenBtn}${nodeActions(doc.path, "doc")}<a class="btn" href="${raw}" target="_blank" rel="noopener">Open raw ↗</a>`)}
<iframe id="doc-view" class="pdf-frame" src="${raw}" title="${esc(doc.meta.title)}"></iframe>`,
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

export function newDocPage(sidebar: string, folders: string[], initialFolder: string): string {
  const options = folders
    .map((f) => `<option value="${esc(f)}"${f === initialFolder ? " selected" : ""}>${f === "" ? "(root)" : esc(f)}</option>`)
    .join("");
  return layout({
    title: "New document",
    sidebar,
    content: `
<h1>New document</h1>
<div id="new-doc" class="new-doc">
  <div class="mode-toggle" role="radiogroup" aria-label="Document mode">
    <label class="radio-pill"><input type="radio" name="nd-mode" value="text" checked> Text</label>
    <label class="radio-pill"><input type="radio" name="nd-mode" value="notes"> Notes mode</label>
  </div>
  <p id="nd-hint" class="muted small">A plain markdown document — you'll land in the editor.</p>
  <label class="field">Title
    <input id="nd-title" type="text" placeholder="How the repo market works" autofocus>
  </label>
  <label class="field">File name <span class="muted">(auto from title)</span>
    <input id="nd-filename" type="text" placeholder="how-the-repo-market-works.md">
  </label>
  <label class="field">Folder
    <select id="nd-folder">${options}</select>
  </label>
  <label class="field">Tags <span class="muted">(comma-separated, optional)</span>
    <input id="nd-tags" type="text" placeholder="repo, money-market">
  </label>
  <div id="nd-notes-fields" hidden>
    <label class="field">Situation <span class="muted">(where/why you're taking these notes — context for the AI)</span>
      <textarea id="nd-situation" rows="3" placeholder="e.g. I am sitting at the bonds and T-bills desk of the bank, being taught how repo works"></textarea>
    </label>
    <label class="field">Notes <span class="muted">(bullets, fragments, typos welcome — one thought per line)</span>
      <textarea id="nd-notes" rows="16" placeholder="spread over SOFR&#10;repo vs reverse repo&#10;if the bond defaults i return the cash…"></textarea>
    </label>
  </div>
  <div class="doc-actions">
    <button id="nd-create" class="btn btn-primary">Create</button>
    <span id="nd-status" class="muted"></span>
  </div>
</div>`,
  });
}

export function errorPage(sidebar: string, status: number, message: string): string {
  return layout({
    title: `${status}`,
    sidebar,
    content: `<h1>${status}</h1><p>${esc(message)}</p><p><a href="/">← back to the archive</a></p>`,
  });
}
