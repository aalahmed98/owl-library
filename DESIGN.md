# Design

Visual system for Owl Library: "catalog of record". Precise, quiet, archival. Documents are the star; identity moments (login, picker, home masthead) carry the brand. Register: brand, executed with product discipline on working surfaces.

## Theme

Dual theme. Light is warm paper with ink text; dark is warm ink (never blue-black). Users toggle via `data-theme` on `<html>`; tokens live in `design/tokens.css` and are the single source of truth for the site AND interactive papers (papers inline the token block).

## Color

All color in OKLCH, warm hue family (66–85). Strategy: restrained with one committed accent.

- Paper (light bg): `oklch(0.977 0.004 85)` / surface `oklch(0.993 0.002 85)`
- Ink (light fg): `oklch(0.245 0.012 75)`; muted `oklch(0.5 0.014 75)`; border `oklch(0.895 0.008 80)`
- **Accent, burnt ochre**: light `oklch(0.53 0.105 66)`, dark `oklch(0.78 0.105 75)`. Carries the owl mark, links, primary buttons, focus rings, active states. Never introduce a second accent.
- Dark bg `oklch(0.205 0.008 75)`; dark surface `oklch(0.243 0.009 75)`; dark fg `oklch(0.9 0.008 80)`
- Semantic hues stay quiet and bordered: shared=green `oklch(0.5 0.1 155)`, interactive/html=violet `oklch(0.5 0.14 300)`, pdf/danger=red `oklch(0.52 0.14 29)` (dark variants lighter)
- Never `#000` or `#fff`; every neutral is warm-tinted.

## Typography

- **UI**: Schibsted Grotesk (vendored variable woff2, weights 400–900). Tight tracking on headings (`--track-tight: -0.015em`). App-page h1s are Schibsted 700.
- **Documents**: Literata (vendored variable, + italic). Doc titles, index-row titles, prose, doc summaries (italic). Picker avatars use Literata initials.
- **Mono**: system stack, code only.
- Scale ratio 1.25: 0.75 / 0.875 / 1.0625 / 1.25 / 1.5625 / 1.953 / 2.441 rem. Body line-height 1.65, max measure 68ch.
- `@font-face` lives in `public/styles.css` (NOT tokens.css) so papers stay self-contained and fall back to Charter/Georgia/system-ui.

## Signature elements

- **The catalog rule**: double hairline (1px ink over 1px border, 4px apart) under every page head, doc header, and the auth wordmark. This is the brand motif; keep it.
- **The owl mark**: geometric SVG (brow chevron over two ring eyes), `owlMark` in `src/server/render/layout.ts`. Always accent-colored, 22px topbar / 28px auth. Never redrawn cute.
- **Index rows** (`.index-row`): the ONE list component. Literata title + bordered badges + muted path + tabular date, hairline separators, accent-soft hover. Used on home sections, folder pages, and search results (search adds snippet + tags lines). No card grids.
- **Catalog headers** (`.catalog-h`): section label + muted count, optional one-line hint.

## Components

- Badges: bordered rounded-rect (3px), xs bold, color-on-transparent. Format (Markdown/Interactive/PDF), visibility (Shared/Private), status.
- Buttons: `.btn` surface+border, `.btn-primary` solid accent. Plain "+" prefix, no emoji/unicode glyph buttons (they tofu on some platforms).
- Forms: `.field` label-above pattern, full-width inputs, accent focus outline.
- Auth pages: card on ochre-soft wash (light) / plain ink (dark); owl + wordmark + catalog rule at top.
- Sidebar: "LIBRARY" small-caps label, folders as `<details>`, docs with format-colored dot prefix.

## Motion & a11y

120ms ease-out on background/border-color only. `prefers-reduced-motion` kills all transitions. Global `:focus-visible` accent outline. WCAG AA contrast both themes.

## Copy rules

No em dashes in UI copy (commas, colons, semicolons, periods). "library", not "archive", in user-facing text. No emoji in chrome.

## Known debt

Interactive HTML papers under `content/` still carry the previous (blue) token block inline; run the `library-maintenance` skill's token re-sync pass to update them to the ochre system.
