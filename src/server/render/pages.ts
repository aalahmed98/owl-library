import { DocRead } from "../../core/docs.js";
import { FolderNode, DocNode, TreeNode } from "../../core/tree.js";
import { SearchHit } from "../../core/search.js";
import { TocEntry } from "../markdown.js";
import { isRawNotesDoc } from "../organize.js";
import { esc, layout } from "./layout.js";
import { canWrite, type Role } from "../../core/role.js";

const FORMAT_LABEL: Record<string, string> = { md: "Markdown", html: "Interactive", pdf: "PDF" };

function plural(n: number, one: string, many = one + "s"): string {
  return `${n} ${n === 1 ? one : many}`;
}

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
  return `<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Library</a>${links.map((l) => " / " + l).join("")}</nav>`;
}

function docRow(d: DocNode): string {
  return `<a class="index-row" href="/doc/${encodeURI(d.path)}">
<span class="ix-main"><span class="ix-title">${esc(d.title)}</span> <span class="badge badge-${d.format}">${FORMAT_LABEL[d.format]}</span></span>
<span class="ix-date" title="${d.created ? "created" : "modified"}">${esc(d.created ?? d.modified)}</span>
<span class="ix-path">${esc(d.path)}</span>
</a>`;
}

function folderRow(f: FolderNode): string {
  return `<a class="index-row is-folder" href="/folder/${encodeURI(f.path)}">
<span class="ix-main"><span class="ix-title">${esc(f.name)}/</span></span>
<span class="ix-date">${plural(f.children.length, "item")}</span>
</a>`;
}

function indexList(rows: string[], empty: string): string {
  if (!rows.length) return `<p class="empty-note">${empty}</p>`;
  return `<div class="index-list">\n${rows.join("\n")}\n</div>`;
}

function nodeRows(children: TreeNode[]): string[] {
  return children.map((c) => (c.kind === "folder" ? folderRow(c) : docRow(c)));
}

function catalogH(label: string, count: number): string {
  return `<h2 class="catalog-h">${label} <span class="count">${count}</span></h2>`;
}

function countTree(root: FolderNode): { docs: number; folders: number } {
  let docs = 0;
  let folders = 0;
  const walk = (n: TreeNode): void => {
    if (n.kind === "doc") docs += 1;
    else {
      folders += 1;
      n.children.forEach(walk);
    }
  };
  root.children.forEach(walk);
  return { docs, folders };
}

export function homePage(
  sidebar: string,
  root: FolderNode,
  tagList: { tag: string; count: number }[],
  recent: DocNode[],
  role: Role,
): string {
  const admin = canWrite(role);
  const { docs, folders } = countTree(root);
  const actions = admin
    ? `
  <div class="doc-actions">
    <a class="btn btn-primary" href="/new">+ New doc</a>
    <button class="btn js-newfolder" data-parent="">+ New folder</button>
  </div>`
    : "";
  const emptyLibrary = admin
    ? "The library is empty. Create a doc or a folder to get started."
    : "Nothing has been added to the library yet.";
  return layout({
    title: "Home",
    sidebar,
    role,
    content: `
<div class="page-head is-hero">
  <div class="head-text">
    <p class="eyebrow">Research library</p>
    <h1>Owl Library</h1>
    <p class="head-sub">${plural(docs, "document")} in ${plural(folders, "folder")}</p>
  </div>${actions}
</div>
<section class="home-section">
${catalogH("Recent", recent.length)}
${indexList(recent.map((d) => docRow(d)), emptyLibrary)}
</section>
<section class="home-section">
${catalogH("Browse", root.children.length)}
${indexList(nodeRows(root.children), "No folders or documents at the top level yet.")}
</section>
<section class="home-section">
${catalogH("Tags", tagList.length)}
${
  tagList.length
    ? `<p class="tag-cloud">${tagList.map((t) => `<a class="tag-chip" href="/search?q=${encodeURIComponent(t.tag)}">${esc(t.tag)} <span class="muted">${t.count}</span></a>`).join("")}</p>`
    : '<p class="empty-note">No tags yet. Tags appear here once documents have them.</p>'
}
</section>`,
  });
}

export function folderPage(sidebar: string, folder: FolderNode, role: Role): string {
  const actions = canWrite(role)
    ? `
  <div class="doc-actions">
    <a class="btn btn-primary" href="/new?folder=${encodeURIComponent(folder.path)}">+ New doc</a>
    <button class="btn js-newfolder" data-parent="${esc(folder.path)}">+ New folder</button>
    ${nodeActions(folder.path, "folder")}
  </div>`
    : "";
  return layout({
    title: folder.name,
    sidebar,
    role,
    content: `
${breadcrumbs(folder.path + "/x")}
<div class="page-head">
  <div class="head-text">
    <p class="eyebrow">Folder</p>
    <h1>${esc(folder.name)}</h1>
    <p class="head-sub">${plural(folder.children.length, "item")}</p>
  </div>${actions}
</div>
${indexList(nodeRows(folder.children), "This folder is empty.")}`,
  });
}

function docHeader(doc: DocRead, actions: string, opts?: { compact?: boolean }): string {
  const compact = opts?.compact === true;
  return `${breadcrumbs(doc.path)}
<div class="doc-header${compact ? " is-compact" : ""}">
  <h1 class="doc-title">${esc(doc.meta.title)}</h1>
  <div class="doc-actions">${actions}</div>
</div>
<p class="doc-meta">
  <span class="badge badge-${doc.format}">${FORMAT_LABEL[doc.format]}</span>
  ${doc.meta.status ? `<span class="badge">${esc(doc.meta.status)}</span>` : ""}
  ${doc.meta.updated ? `<span class="muted">Updated ${esc(doc.meta.updated)}</span>` : ""}
  ${tagChips(doc.meta.tags)}
  ${doc.meta.source ? `<a class="small" href="${esc(doc.meta.source)}" target="_blank" rel="noopener">Source</a>` : ""}
</p>
${doc.meta.summary && !compact ? `<p class="doc-summary">${esc(doc.meta.summary)}</p>` : ""}`;
}

const fullscreenBtn = `<button id="fullscreen-btn" class="btn" title="Fullscreen (f)">Fullscreen</button>`;

/** Move / rename / delete controls. Only ever rendered for the admin. */
function nodeActions(relPath: string, kind: "doc" | "folder"): string {
  return `<button class="btn js-move" data-path="${esc(relPath)}" data-kind="${kind}">Move</button><button class="btn js-rename" data-path="${esc(relPath)}" data-kind="${kind}">Rename</button><button class="btn btn-danger js-delete" data-path="${esc(relPath)}" data-kind="${kind}">Delete</button>`;
}

export function markdownDocPage(sidebar: string, doc: DocRead, html: string, toc: TocEntry[], role: Role): string {
  const admin = canWrite(role);
  const rail = toc.length
    ? `<div class="toc"><p class="toc-title">On this page</p>
${toc.map((t) => `<a class="toc-link toc-d${t.depth}" href="#${esc(t.id)}">${esc(t.text)}</a>`).join("\n")}
</div>`
    : undefined;
  const organizeBtn = admin && isRawNotesDoc(doc.content)
    ? `<button class="btn btn-primary js-organize" data-path="${esc(doc.path)}" title="Organize these raw notes with AI">Organize</button>`
    : "";
  const adminActions = admin
    ? `<a class="btn btn-primary" href="/edit/${encodeURI(doc.path)}">Edit</a>${nodeActions(doc.path, "doc")}`
    : "";
  return layout({
    title: doc.meta.title,
    sidebar,
    rail,
    role,
    content: `${docHeader(doc, `${organizeBtn}${adminActions}${fullscreenBtn}`)}
<div id="doc-view" class="doc-view">
<article class="prose">
${html}
</article>
</div>`,
  });
}

/** Header for docs shown in a frame: the doc brings its own title, so the site's stays small. */
function framedDocHeader(doc: DocRead, role: Role, raw: string): string {
  const adminActions = canWrite(role) ? nodeActions(doc.path, "doc") : "";
  return docHeader(
    doc,
    `${adminActions}${fullscreenBtn}<a class="btn" href="${raw}" target="_blank" rel="noopener">Open in new tab</a>`,
    { compact: true },
  );
}

export function htmlDocPage(sidebar: string, doc: DocRead, role: Role): string {
  const raw = `/raw/${encodeURI(doc.path)}`;
  return layout({
    title: doc.meta.title,
    sidebar,
    role,
    content: `${framedDocHeader(doc, role, raw)}
<iframe id="doc-view" class="paper-frame" sandbox="allow-scripts" src="${raw}?embed=1" title="${esc(doc.meta.title)}"></iframe>`,
  });
}

export function pdfDocPage(sidebar: string, doc: DocRead, role: Role): string {
  const raw = `/raw/${encodeURI(doc.path)}`;
  return layout({
    title: doc.meta.title,
    sidebar,
    role,
    content: `${framedDocHeader(doc, role, raw)}
<iframe id="doc-view" class="pdf-frame" src="${raw}" title="${esc(doc.meta.title)}"></iframe>`,
  });
}

export function searchPage(sidebar: string, query: string, hits: SearchHit[], role: Role): string {
  return layout({
    title: query ? `Search: ${query}` : "Search",
    sidebar,
    role,
    content: `
<div class="page-head">
  <div class="head-text">
    <p class="eyebrow">Search</p>
    <h1>${query ? `Results for “${esc(query)}”` : "Search the library"}</h1>
  </div>
</div>
<form method="get" action="/search" class="search-form" role="search">
  <input name="q" type="search" value="${esc(query)}" placeholder="Titles, tags, headings or text" aria-label="Search the library" autofocus>
  <button class="btn btn-primary" type="submit">Search</button>
</form>
${
  query
    ? hits.length
      ? `<p class="result-count muted small">${plural(hits.length, "result")}</p>
<div class="index-list results">${hits
          .map(
            (h) => `<a class="index-row" href="/doc/${encodeURI(h.path)}">
<span class="ix-main"><span class="ix-title">${esc(h.title)}</span> <span class="badge badge-${h.format}">${FORMAT_LABEL[h.format] ?? h.format}</span></span>
<span class="ix-path">${esc(h.path)}</span>
<span class="ix-snippet">${esc(h.snippet)}</span>
${h.tags.length ? `<span class="ix-tags">${h.tags.map(esc).join(" · ")}</span>` : ""}
</a>`,
          )
          .join("\n")}</div>`
      : `<p class="empty-note">Nothing matches “${esc(query)}”. Try a shorter word or a tag.</p>`
    : `<p class="empty-note">Type a word above. Search covers titles, tags, headings and the text of Markdown and interactive documents.</p>`
}`,
  });
}

export function editPage(sidebar: string, doc: DocRead, role: Role): string {
  return layout({
    title: `Edit: ${doc.meta.title}`,
    sidebar,
    role,
    content: `${breadcrumbs(doc.path)}
<div class="doc-header is-compact">
  <h1 class="doc-title">Editing: ${esc(doc.meta.title)}</h1>
  <div class="doc-actions">
    <span id="editor-status" class="muted small"></span>
    <button id="editor-save" class="btn btn-primary">Save</button>
    <a class="btn" href="/doc/${encodeURI(doc.path)}">View</a>
  </div>
</div>
<div id="editor-conflict" class="banner banner-warn" hidden>
  This file changed on the server since you opened it. <button id="editor-reload" class="btn">Reload latest</button>
</div>
<div id="editor" class="editor-host" data-path="${esc(doc.path)}"></div>`,
    scripts: `<script src="/assets/js/editor.js"></script>`,
  });
}

export function newDocPage(sidebar: string, folders: string[], initialFolder: string, role: Role): string {
  const options = folders
    .map((f) => `<option value="${esc(f)}"${f === initialFolder ? " selected" : ""}>${f === "" ? "(top level)" : esc(f)}</option>`)
    .join("");
  return layout({
    title: "New document",
    sidebar,
    role,
    content: `
<div class="page-head">
  <div class="head-text">
    <p class="eyebrow">Create</p>
    <h1>New document</h1>
  </div>
</div>
<div id="new-doc" class="new-doc">
  <div class="mode-toggle" role="radiogroup" aria-label="Document mode">
    <label class="radio-pill"><input type="radio" name="nd-mode" value="text" checked> Text</label>
    <label class="radio-pill"><input type="radio" name="nd-mode" value="notes"> Notes mode</label>
  </div>
  <p id="nd-hint" class="muted small">A plain markdown document; you'll land in the editor.</p>
  <label class="field">Title
    <input id="nd-title" type="text" placeholder="How the repo market works" autofocus>
  </label>
  <label class="field">File name <span class="muted">(filled in from the title)</span>
    <input id="nd-filename" type="text" placeholder="how-the-repo-market-works.md">
  </label>
  <label class="field">Folder
    <select id="nd-folder">${options}</select>
  </label>
  <label class="field">Tags <span class="muted">(comma-separated, optional)</span>
    <input id="nd-tags" type="text" placeholder="repo, money-market">
  </label>
  <div id="nd-notes-fields" hidden>
    <label class="field">Situation <span class="muted">(where and why you're taking these notes; context for the AI)</span>
      <textarea id="nd-situation" rows="3" placeholder="e.g. I am sitting at the bonds and T-bills desk of the bank, being taught how repo works"></textarea>
    </label>
    <label class="field">Notes <span class="muted">(bullets, fragments, typos welcome, one thought per line)</span>
      <textarea id="nd-notes" rows="16" placeholder="spread over SOFR&#10;repo vs reverse repo&#10;if the bond defaults i return the cash…"></textarea>
    </label>
  </div>
  <div class="form-actions">
    <button id="nd-create" class="btn btn-primary">Create document</button>
    <span id="nd-status" class="muted small"></span>
  </div>
</div>`,
  });
}

export function errorPage(sidebar: string, status: number, message: string, role: Role): string {
  return layout({
    title: `${status}`,
    sidebar,
    role,
    content: `<div class="error-page">
  <p class="eyebrow">Error ${status}</p>
  <h1>${esc(message)}</h1>
  <p>The link may be old, or the item may have been moved or removed.</p>
  <p><a class="btn" href="/">Back to the library</a></p>
</div>`,
  });
}
