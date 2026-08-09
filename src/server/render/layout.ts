export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface LayoutOptions {
  title: string;
  sidebar: string;
  content: string;
  /** Extra scripts (already-formed <script> tags) appended before </body>. */
  scripts?: string;
  /** Right rail (e.g. TOC); omitted = two-column layout. */
  rail?: string;
  /** Who's currently browsing — attribution lens only, not an access boundary. */
  identity?: "haman" | "ali";
}

export function layout(o: LayoutOptions): string {
  const identity = o.identity ?? "haman";
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
  <a class="brand" href="/">Owl<strong>Library</strong></a>
  <div class="searchbox">
    <input id="search-input" type="search" placeholder="Search the archive…" autocomplete="off">
    <div id="search-results" class="search-results" hidden></div>
  </div>
  <form class="identity-switch" method="post" action="/identity">
    <label for="identity-select">Browsing as</label>
    <select id="identity-select" name="identity" onchange="this.form.submit()">
      <option value="haman"${identity === "haman" ? " selected" : ""}>Haman</option>
      <option value="ali"${identity === "ali" ? " selected" : ""}>Ali</option>
    </select>
  </form>
  <button id="theme-toggle" class="icon-btn" title="Toggle theme" aria-label="Toggle theme">◐</button>
  <form method="post" action="/logout"><button class="icon-btn" title="Log out" aria-label="Log out">⏻</button></form>
</header>
<div class="shell${o.rail ? " has-rail" : ""}">
  <nav class="sidebar" id="sidebar">
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
