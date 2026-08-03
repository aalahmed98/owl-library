// Shared client behavior: theme toggle, tree persistence, live search, TOC scroll-spy.

// ── theme ────────────────────────────────────────────
const themeBtn = document.getElementById("theme-toggle");
themeBtn?.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  localStorage.setItem("archive-theme", next);
});

// ── sidebar tree expand-state persistence ────────────
const TREE_KEY = "archive-tree-open";
const openSet = new Set<string>(JSON.parse(localStorage.getItem(TREE_KEY) ?? "[]"));
for (const details of document.querySelectorAll<HTMLDetailsElement>(".tree-folder")) {
  const p = details.dataset.path ?? "";
  if (openSet.has(p)) details.open = true;
  details.addEventListener("toggle", () => {
    if (details.open) openSet.add(p);
    else openSet.delete(p);
    localStorage.setItem(TREE_KEY, JSON.stringify([...openSet]));
  });
}

// ── live search dropdown ─────────────────────────────
const input = document.getElementById("search-input") as HTMLInputElement | null;
const resultsEl = document.getElementById("search-results");
let debounceTimer: number | undefined;
let selected = -1;

interface Hit { path: string; title: string; snippet: string; format: string }

function hideResults(): void {
  if (resultsEl) {
    resultsEl.hidden = true;
    resultsEl.innerHTML = "";
  }
  selected = -1;
}

function renderHits(hits: Hit[]): void {
  if (!resultsEl) return;
  if (!hits.length) {
    hideResults();
    return;
  }
  resultsEl.innerHTML = hits
    .map(
      (h) =>
        `<a href="/doc/${encodeURI(h.path)}"><div class="sr-title">${escapeHtml(h.title)}</div>` +
        `<div class="sr-path">${escapeHtml(h.path)}</div></a>`,
    )
    .join("");
  resultsEl.hidden = false;
  selected = -1;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

input?.addEventListener("input", () => {
  window.clearTimeout(debounceTimer);
  const q = input.value.trim();
  if (!q) {
    hideResults();
    return;
  }
  debounceTimer = window.setTimeout(async () => {
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=8`);
    const data = (await res.json()) as { hits: Hit[] };
    renderHits(data.hits);
  }, 150);
});

input?.addEventListener("keydown", (e) => {
  const links = resultsEl?.querySelectorAll<HTMLAnchorElement>("a") ?? [];
  if (e.key === "Enter") {
    const link = selected >= 0 ? links[selected] : undefined;
    if (link) {
      link.click();
    } else if (input.value.trim()) {
      location.href = `/search?q=${encodeURIComponent(input.value.trim())}`;
    }
    e.preventDefault();
  } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    if (!links.length) return;
    selected = e.key === "ArrowDown" ? Math.min(selected + 1, links.length - 1) : Math.max(selected - 1, 0);
    links.forEach((l, i) => l.classList.toggle("selected", i === selected));
    e.preventDefault();
  } else if (e.key === "Escape") {
    hideResults();
  }
});

document.addEventListener("click", (e) => {
  if (resultsEl && !resultsEl.hidden && !(e.target as HTMLElement).closest(".searchbox")) hideResults();
});

// "/" focuses search
document.addEventListener("keydown", (e) => {
  if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && !(document.activeElement?.className ?? "").includes("cm-")) {
    input?.focus();
    e.preventDefault();
  }
});

// ── TOC scroll-spy ───────────────────────────────────
const tocLinks = [...document.querySelectorAll<HTMLAnchorElement>(".toc-link")];
if (tocLinks.length) {
  const targets = tocLinks
    .map((l) => document.getElementById(decodeURIComponent(l.hash.slice(1))))
    .filter((el): el is HTMLElement => !!el);
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          tocLinks.forEach((l) => l.classList.toggle("active", l.hash === `#${entry.target.id}`));
        }
      }
    },
    { rootMargin: "0px 0px -75% 0px" },
  );
  targets.forEach((t) => observer.observe(t));
}
