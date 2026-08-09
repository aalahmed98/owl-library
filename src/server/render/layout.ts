export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** The owl mark: brow chevron over two ring eyes. Geometric, single color. */
export const owlMark = `<svg class="owl" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 19 16 6l11.5 13"/><circle cx="10.5" cy="20" r="5"/><circle cx="21.5" cy="20" r="5"/><circle cx="10.5" cy="20" r="1.4" fill="currentColor" stroke="none"/><circle cx="21.5" cy="20" r="1.4" fill="currentColor" stroke="none"/></svg>`;

export interface LayoutOptions {
  title: string;
  sidebar: string;
  content: string;
  /** Extra scripts (already-formed <script> tags) appended before </body>. */
  scripts?: string;
  /** Right rail (e.g. TOC); omitted = two-column layout. */
  rail?: string;
  /** The signed-in person; identity is fixed per session (switching = logout). */
  identity: "haman" | "ali";
}

export function layout(o: LayoutOptions): string {
  const label = o.identity === "ali" ? "Ali" : "Haman";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(o.title)} · Owl Library</title>
<link rel="stylesheet" href="/assets/design/tokens.css">
<link rel="stylesheet" href="/assets/vendor/katex/katex.min.css">
<link rel="stylesheet" href="/assets/styles.css">
<script>
// pre-paint theme to avoid flash
(function () {
  var t = localStorage.getItem("archive-theme");
  if (!t) t = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  document.documentElement.dataset.theme = t;
})();
</script>
</head>
<body>
<header class="topbar">
  <a class="brand" href="/">${owlMark}<span>Owl Library</span></a>
  <div class="searchbox">
    <input id="search-input" type="search" placeholder="Search the library…" autocomplete="off">
    <div id="search-results" class="search-results" hidden></div>
  </div>
  <span class="whoami" title="Switch person by logging out">${label}</span>
  <button id="theme-toggle" class="icon-btn" title="Toggle theme" aria-label="Toggle theme">◐</button>
  <form class="logout-form" method="post" action="/logout"><button class="icon-btn" type="submit">Log out</button></form>
</header>
<div class="shell${o.rail ? " has-rail" : ""}">
  <nav class="sidebar" id="sidebar">
  <p class="side-label">Library</p>
${o.sidebar}
  </nav>
  <main class="content">
${o.content}
  </main>
${o.rail ? `  <aside class="rail">\n${o.rail}\n  </aside>` : ""}
</div>
<script src="/assets/js/app.js"></script>
${o.scripts ?? ""}
</body>
</html>`;
}
