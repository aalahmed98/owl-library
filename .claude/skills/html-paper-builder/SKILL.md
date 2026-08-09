---
name: html-paper-builder
description: Build interactive HTML papers for owl-library — self-contained pages with sliders, live charts, and derivations that share the archive's design system. Use whenever creating or restyling an .html doc in owl-library (papers/ folder), or converting research into an interactive explainer.
---

# Interactive HTML Paper Builder

Papers are single, fully self-contained `.html` files that render correctly in three contexts: inside the archive's sandboxed iframe, opened as a raw browser tab, and double-clicked offline from the filesystem.

## Hard rules

1. **Zero external requests.** No CDNs, no web fonts, no remote images, no fetch. The iframe sandbox and offline use make any external reference a silent failure. All JS and CSS inline; images as data URIs or inline SVG.
2. **Start from `template.html`** (in this skill's folder). It carries the archive meta tags, the design-token block, base typography, and widget styles. Never hand-roll the boilerplate.
3. **Don't edit inside the `/* ==tokens== */ … /* ==/tokens== */` markers.** That block is a synced copy of `design/tokens.css`; the library-maintenance skill refreshes it. Add custom styles *after* the markers.
4. **Fill the archive meta tags** (`<title>`, `archive-tags`, `archive-summary`, `archive-created`, `archive-updated`, `archive-status`, plus `archive-source`/`archive-authors` when adapting external work) following the doc-conventions skill.
5. **File into `papers/`** (topical subfolder when one exists) via owl-library `create_doc` with the complete HTML as `content`.

## Workflow

1. Read `template.html` and `components.md` from this skill's folder.
2. If the paper's topic already has docs, `search` + `list_tags` to link related notes and reuse tags.
3. Write the prose first — a paper is mainly text; widgets illustrate, not decorate. Use `.widget` blocks only where a parameter genuinely changes understanding.
4. Build interactions from `components.md` snippets (slider + `lineChart`/`barChart`, derivation `<details>`, figures). Keep every widget wired: a slider without a visible effect is a bug.
5. Theme-check both modes: the app iframe sets no `data-theme` on your document, so standalone dark mode comes from the `prefers-color-scheme` block already in the template — don't remove it. Verify colors only ever come from `var(--…)` tokens.
6. Create via `create_doc`; then open `http://localhost:7333/doc/<path>` to verify it renders and interacts inside the sandbox (scripts run, but `window.parent` access will throw — never rely on the parent page).

## Quality bar

- Reads like a paper: title, byline, sectioned prose, figures with numbered captions.
- Every interactive element has a label and an initial state that already tells the story.
- Charts have axes, tick labels, and units. Use `.series` / `.series-2` / `.bar` classes so they theme correctly.
- Under ~200KB total; if an asset would push past that, reconsider the asset.
