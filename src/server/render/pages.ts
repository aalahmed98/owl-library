import { DocRead } from "../../core/docs.js";
import { FolderNode, DocNode, TreeNode } from "../../core/tree.js";
import { SearchHit } from "../../core/search.js";
import { TocEntry } from "../markdown.js";
import { isRawNotesDoc } from "../organize.js";
import { esc, layout } from "./layout.js";

const FORMAT_LABEL: Record<string, string> = { md: "Markdown", html: "Interactive", pdf: "PDF" };

type Identity = "haman" | "ali";

function spaceBadge(space: string): string {
  return space === "shared"
    ? '<span class="badge badge-shared">Shared</span>'
    : '<span class="badge badge-private">Private</span>';
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
  return `<nav class="breadcrumbs"><a href="/">library</a>${links.map((l) => " / " + l).join("")}</nav>`;
}

function docRow(d: DocNode, opts?: { showSpace?: boolean }): string {
  const space = opts?.showSpace === false ? "" : spaceBadge(d.space);
  return `<a class="index-row" href="/doc/${encodeURI(d.path)}">
<span class="ix-main"><span class="ix-title">${esc(d.title)}</span> <span class="badge badge-${d.format}">${FORMAT_LABEL[d.format]}</span>${space}</span>
<span class="ix-date" title="${d.created ? "created" : "modified"}">${esc(d.created ?? d.modified)}</span>
<span class="ix-path">${esc(d.path)}</span>
</a>`;
}

function folderRow(f: FolderNode): string {
  const n = f.children.length;
  return `<a class="index-row is-folder" href="/folder/${encodeURI(f.path)}">
<span class="ix-main"><span class="ix-title">${esc(f.name)}/</span></span>
<span class="ix-date">${n} item${n === 1 ? "" : "s"}</span>
</a>`;
}

function indexList(rows: string[], empty: string): string {
  if (!rows.length) return `<p class="muted small">${empty}</p>`;
  return `<div class="index-list">\n${rows.join("\n")}\n</div>`;
}

function nodeRows(children: TreeNode[]): string[] {
  return children.map((c) => (c.kind === "folder" ? folderRow(c) : docRow(c)));
}

function catalogH(label: string, count: number, hint?: string): string {
  return `<h2 class="catalog-h">${label} <span class="count">${count}</span></h2>${hint ? `\n<p class="catalog-hint muted small">${hint}</p>` : ""}`;
}

export function homePage(
  sidebar: string,
  root: FolderNode,
  tagList: { tag: string; count: number }[],
  sharedRecent: DocNode[],
  personalRecent: DocNode[],
  identity: Identity,
): string {
  return layout({
    title: "Home",
    sidebar,
    identity,
    content: `
<div class="page-head">
  <h1>Owl Library</h1>
  <div class="doc-actions">
    <a class="btn btn-primary" href="/new">+ New doc</a>
    <button class="btn js-newfolder" data-parent="">+ New folder</button>
  </div>
</div>
<section class="home-section">
${catalogH("Shared", sharedRecent.length, "Visible to both of you.")}
${indexList(sharedRecent.map((d) => docRow(d, { showSpace: false })), "Nothing shared yet.")}
</section>
<section class="home-section">
${catalogH("Private", personalRecent.length, "Only you can see these. Use “Make shared” on a doc when it's ready.")}
${indexList(personalRecent.map((d) => docRow(d, { showSpace: false })), "No private docs yet.")}
</section>
<section class="home-section">
${catalogH("Browse", root.children.length)}
${indexList(nodeRows(root.children), "The library is empty.")}
</section>
${catalogH("Tags", tagList.length)}
<p>${tagList.map((t) => `<a class="tag-chip" href="/search?q=${encodeURIComponent(t.tag)}">${esc(t.tag)} <span class="muted">${t.count}</span></a>`).join(" ") || '<span class="muted small">No tags yet.</span>'}</p>`,
  });
}

export function folderPage(sidebar: string, folder: FolderNode, identity: Identity): string {
  return layout({
    title: folder.name,
    sidebar,
    identity,
    content: `
${breadcrumbs(folder.path + "/x")}
<div class="page-head">
  <h1>${esc(folder.name)}/</h1>
  <div class="doc-actions">
    <a class="btn btn-primary" href="/new?folder=${encodeURIComponent(folder.path)}">+ New doc</a>
    <button class="btn js-newfolder" data-parent="${esc(folder.path)}">+ New folder</button>
    <button class="btn js-move" data-path="${esc(folder.path)}" data-kind="folder">Move…</button>
    <button class="btn js-rename" data-path="${esc(folder.path)}" data-kind="folder">Rename</button>
  </div>
</div>
${indexList(nodeRows(folder.children), "This folder is empty.")}`,
  });
}

function docHeader(doc: DocRead, actions: string): string {
  const isShared = doc.meta.space === "shared";
  const toggleBtn = `<button class="btn js-space" data-path="${esc(doc.path)}" data-next="${isShared ? "private" : "shared"}" title="${isShared ? "Only you will see this doc" : "Both of you will see this doc"}">${isShared ? "Make private" : "Make shared"}</button>`;
  return `${breadcrumbs(doc.path)}
<div class="doc-header">
  <h1 class="doc-title">${esc(doc.meta.title)}</h1>
  <div class="doc-actions">${toggleBtn}${actions}</div>
</div>
<p class="doc-meta">
  <span class="badge badge-${doc.format}">${FORMAT_LABEL[doc.format]}</span>
  ${spaceBadge(doc.meta.space ?? "private")}
  ${doc.meta.status ? `<span class="badge">${esc(doc.meta.status)}</span>` : ""}
  ${doc.meta.updated ? `<span class="muted">updated ${esc(doc.meta.updated)}</span>` : ""}
  ${tagChips(doc.meta.tags)}
  ${doc.meta.source ? `<a class="muted small" href="${esc(doc.meta.source)}" target="_blank" rel="noopener">source ↗</a>` : ""}
</p>
${doc.meta.summary ? `<p class="doc-summary">${esc(doc.meta.summary)}</p>` : ""}`;
}

const fullscreenBtn = `<button id="fullscreen-btn" class="btn" title="Fullscreen (f)">Fullscreen</button>`;

function nodeActions(relPath: string, kind: "doc" | "folder"): string {
  return `<button class="btn js-move" data-path="${esc(relPath)}" data-kind="${kind}">Move…</button><button class="btn js-rename" data-path="${esc(relPath)}" data-kind="${kind}">Rename</button>`;
}

export function markdownDocPage(sidebar: string, doc: DocRead, html: string, toc: TocEntry[], identity: Identity): string {
  const rail = toc.length
    ? `<div class="toc"><p class="toc-title">On this page</p>
${toc.map((t) => `<a class="toc-link toc-d${t.depth}" href="#${esc(t.id)}">${esc(t.text)}</a>`).join("\n")}
</div>`
    : undefined;
  const organizeBtn = isRawNotesDoc(doc.content)
    ? `<button class="btn btn-primary js-organize" data-path="${esc(doc.path)}" title="Organize these raw notes with AI">Organize</button>`
    : "";
  return layout({
    title: doc.meta.title,
    sidebar,
    rail,
    identity,
    content: `${docHeader(doc, `${organizeBtn}${fullscreenBtn}${nodeActions(doc.path, "doc")}<a class="btn" href="/edit/${encodeURI(doc.path)}">Edit</a>`)}
<div id="doc-view" class="doc-view">
<article class="prose">
${html}
</article>
</div>`,
  });
}

export function htmlDocPage(sidebar: string, doc: DocRead, identity: Identity): string {
  const raw = `/raw/${encodeURI(doc.path)}`;
  return layout({
    title: doc.meta.title,
    sidebar,
    identity,
    content: `${docHeader(doc, `${fullscreenBtn}${nodeActions(doc.path, "doc")}<a class="btn" href="${raw}" target="_blank" rel="noopener">Open raw ↗</a>`)}
<iframe id="doc-view" class="paper-frame" sandbox="allow-scripts" src="${raw}" title="${esc(doc.meta.title)}"></iframe>`,
  });
}

export function pdfDocPage(sidebar: string, doc: DocRead, identity: Identity): string {
  const raw = `/raw/${encodeURI(doc.path)}`;
  return layout({
    title: doc.meta.title,
    sidebar,
    identity,
    content: `${docHeader(doc, `${fullscreenBtn}${nodeActions(doc.path, "doc")}<a class="btn" href="${raw}" target="_blank" rel="noopener">Open raw ↗</a>`)}
<iframe id="doc-view" class="pdf-frame" src="${raw}" title="${esc(doc.meta.title)}"></iframe>`,
  });
}

export function searchPage(sidebar: string, query: string, hits: SearchHit[], identity: Identity): string {
  return layout({
    title: query ? `Search: ${query}` : "Search",
    sidebar,
    identity,
    content: `
<h1>Search</h1>
<form method="get" action="/search" class="search-form">
  <input name="q" type="search" value="${esc(query)}" placeholder="Search the library…" autofocus>
  <button class="btn" type="submit">Search</button>
</form>
${
  query
    ? hits.length
      ? `<p class="muted small">${hits.length} result${hits.length === 1 ? "" : "s"}</p>
<div class="index-list results">${hits
          .map(
            (h) => `<a class="index-row" href="/doc/${encodeURI(h.path)}">
<span class="ix-main"><span class="ix-title">${esc(h.title)}</span> <span class="badge badge-${h.format}">${FORMAT_LABEL[h.format] ?? h.format}</span>${spaceBadge(h.space)}</span>
<span class="ix-path">${esc(h.path)}</span>
<span class="ix-snippet">${esc(h.snippet)}</span>
${h.tags.length ? `<span class="ix-tags">${h.tags.map(esc).join(" · ")}</span>` : ""}
</a>`,
          )
          .join("\n")}</div>`
      : `<p class="muted">No results for “${esc(query)}”.</p>`
    : ""
}`,
  });
}

export function editPage(sidebar: string, doc: DocRead, identity: Identity): string {
  return layout({
    title: `Edit: ${doc.meta.title}`,
    sidebar,
    identity,
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

export function newDocPage(sidebar: string, folders: string[], initialFolder: string, identity: Identity): string {
  const options = folders
    .map((f) => `<option value="${esc(f)}"${f === initialFolder ? " selected" : ""}>${f === "" ? "(root)" : esc(f)}</option>`)
    .join("");
  return layout({
    title: "New document",
    sidebar,
    identity,
    content: `
<h1>New document</h1>
<div id="new-doc" class="new-doc">
  <div class="mode-toggle" role="radiogroup" aria-label="Document mode">
    <label class="radio-pill"><input type="radio" name="nd-mode" value="text" checked> Text</label>
    <label class="radio-pill"><input type="radio" name="nd-mode" value="notes"> Notes mode</label>
  </div>
  <p id="nd-hint" class="muted small">A plain markdown document; you'll land in the editor.</p>
  <label class="field">Title
    <input id="nd-title" type="text" placeholder="How the repo market works" autofocus>
  </label>
  <label class="field">File name <span class="muted">(auto from title)</span>
    <input id="nd-filename" type="text" placeholder="how-the-repo-market-works.md">
  </label>
  <label class="field">Folder
    <select id="nd-folder">${options}</select>
  </label>
  <label class="field">Visibility
    <select id="nd-space">
      <option value="private" selected>Private: only you (${identity === "ali" ? "Ali" : "Haman"})</option>
      <option value="shared">Shared: both of you</option>
    </select>
  </label>
  <label class="field">Tags <span class="muted">(comma-separated, optional)</span>
    <input id="nd-tags" type="text" placeholder="repo, money-market">
  </label>
  <div id="nd-notes-fields" hidden>
    <label class="field">Situation <span class="muted">(where/why you're taking these notes; context for the AI)</span>
      <textarea id="nd-situation" rows="3" placeholder="e.g. I am sitting at the bonds and T-bills desk of the bank, being taught how repo works"></textarea>
    </label>
    <label class="field">Notes <span class="muted">(bullets, fragments, typos welcome, one thought per line)</span>
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

export function errorPage(sidebar: string, status: number, message: string, identity: Identity): string {
  return layout({
    title: `${status}`,
    sidebar,
    identity,
    content: `<h1>${status}</h1><p>${esc(message)}</p><p><a href="/">← back to the library</a></p>`,
  });
}
