# Design

Visual system for Owl Library: "study desk". Warm paper, warm charcoal, one deep-teal accent. The site is built to sit around the documents it holds, so its chrome uses the same palette, type and shapes as the interactive lessons (the FX Trading Course is the reference doc). Documents are the star; the sign-in page is the one loud moment.

## Theme

Dual theme. Light is warm paper with ink text; dark is warm charcoal (never blue-black, never navy). Users toggle via `data-theme` on `<html>`; tokens live in `design/tokens.css` and are the single source of truth for the site AND interactive papers (papers inline the token block).

An interactive doc shown in the site's frame follows the site's theme: the site posts its theme to the frame, and a small snippet the server adds to framed docs (`?embed=1`, see `src/server/routes/raw.ts`) sets `data-theme` on the doc's root. A doc must therefore style dark mode under `[data-theme="dark"]`, and may also keep a `prefers-color-scheme` fallback for when it is opened on its own.

## Color

Hex tokens, warm-tinted neutrals. Strategy: restrained, one committed accent, one counterpart.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--color-bg` | `#F5F2EA` | `#121110` | page |
| `--color-surface` | `#FFFDF9` | `#1B1A18` | cards, lists, inputs |
| `--color-surface-2` | `#ECE8DD` | `#252321` | tinted wells, table heads, pills |
| `--color-raise` | `#FFFDF9` | `#36332F` | selected segment in a segmented control |
| `--color-fg` / `-fg-2` / `-muted` | `#1A1917` / `#47443E` / `#6B675F` | `#EDEAE4` / `#BDB8AE` / `#938E84` | text, secondary text, labels |
| `--color-border` / `-border-strong` / `-grid` | `#DCD7CA` / `#B8B2A3` / `#E6E1D5` | `#2E2C29` / `#4B4842` / `#292725` | card edges, control edges and section rules, row hairlines |
| `--color-accent` (+ `-fg`, `-soft`) | `#0B6B5F` | `#5FCDB9` | **deep teal**: owl mark, links, primary buttons, eyebrows, focus, active states |
| `--color-second` (+ `-fg`, `-soft`) | `#C8640F` | `#F0953F` | **orange**: the accent's counterpart in a pair (interactive-doc badge and dot, guest marker) |
| `--color-danger` (+ `-soft`) | `#A8321F` | `#F0907F` | destructive actions only |

Rules: never introduce a third hue for decoration. Never pure `#000` or `#fff` as a surface. No colored stripe on one side of a card or callout; use a tinted background or a small dot.

## Typography

- **Headings**: Newsreader (vendored variable woff2), weight 500, tight tracking (`--track-tight`), balanced wrapping. Page titles, section heads, doc titles, index-row titles, doc summaries, the brand wordmark.
- **Everything you read or click**: IBM Plex Sans (vendored variable, + italic). Body 1rem/1.65, max measure 68ch.
- **Figures, paths, code**: IBM Plex Mono (400, 500). Dates, counts, file paths, code.
- **Eyebrow**: 0.75rem, 500, uppercase, 0.1em tracking, accent colored. Sits above a serif heading.
- Scale: 0.75 / 0.875 / 1 / 1.1875 / 1.4375 / 1.875 / 2.5 rem; the home masthead and sign-in headline go larger with `clamp()`.
- `@font-face` lives in `public/styles.css` (NOT tokens.css). Papers reference the same files under `/assets/vendor/fonts/` and fall back to system stacks elsewhere.

## Shapes and sizing

- Radius: 6px inputs and small chips, 10px cards and frames, 14px dialogs and large panels, full pill for buttons, badges, tag chips and the search field.
- Controls are 2.25rem tall in the app (2.5rem in forms); the sign-in controls are 3 to 3.5rem.
- Section rhythm: a page head ends in one hairline (`--color-border-strong`); sections are spaced by `--space-7`.

## Signature elements

- **The owl mark**: geometric SVG (brow chevron over two ring eyes), `owlMark` in `src/server/render/layout.ts`. Accent-colored in the top bar; used oversized and faint on the sign-in panel. Never redrawn cute.
- **Page head** (`.page-head`): accent eyebrow, serif h1, optional one-line sub, actions on the right, single hairline below. The home page uses the larger `.is-hero` variant.
- **Index rows** (`.index-row` inside `.index-list`): the ONE list component. A bordered, rounded surface with hairline-separated rows: serif title, pill badge, mono date, mono path. Used on home, folder pages and search (search adds snippet and tags lines). No card grids.
- **Catalog headers** (`.catalog-h`): serif section label with a mono count pill.
- **Empty states** (`.empty-note`): dashed rounded box with one plain sentence that says what to do next.

## Components

- Badges: filled pills. Markdown = accent-soft, Interactive = second-soft, PDF and status = neutral.
- Tag chips: outlined pills; accent on hover.
- Buttons: `.btn` outlined pill, `.btn-primary` solid accent, `.btn-danger` danger text that fills danger-soft on hover. Plain "+" prefix, no emoji or unicode glyph buttons (the theme switch is an inline SVG).
- Forms: `.field` label-above pattern, full-width inputs on `--color-surface`, accent border and ring on focus. Two-way choices use a segmented control (`.mode-toggle`, `.role-seg`).
- Sign-in: full-height split. Left, a solid teal brand panel with the wordmark, one serif statement and the oversized owl. Right, the form: large serif "Sign in", a Guest/Admin segmented control with a one-line hint that changes with the choice, a 3.5rem password field and button. Below 860px the panel is dropped and the wordmark moves above the form.
- Sidebar: "LIBRARY" label, folders as `<details>` with a chevron, a hairline guide for nesting, docs with a format-colored dot. Active doc = accent-soft fill.
- Doc pages: Markdown docs get the full head, a serif summary, and prose with serif headings (h2 opens with a hairline). Interactive and PDF docs get a compact head so the frame has the room; the framed doc brings its own title.
- Editor: CodeMirror sits on the site's own surfaces in both themes (overrides at the end of `styles.css`).

## Motion & a11y

150ms ease on color, background, border and shadow only. `prefers-reduced-motion` kills all transitions. Global `:focus-visible` accent outline. WCAG AA contrast in both themes.

## Copy rules

No em dashes in UI copy (commas, colons, semicolons, periods). "library", not "archive", in user-facing text. No emoji in chrome. Empty states and errors say what happened and what to do next.
