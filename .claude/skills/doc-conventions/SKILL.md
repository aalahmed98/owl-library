---
name: doc-conventions
description: theArchive document conventions — frontmatter schema, naming, folder rules, tag style. Use BEFORE creating or reorganizing any doc in theArchive (via the-archive MCP tools or otherwise), and when deciding where a doc belongs or which format (.md / .html / .pdf) to use.
---

# theArchive Document Conventions

Every doc in the archive follows these rules. Always use the **the-archive MCP tools** (`create_doc`, `edit_doc`, `set_meta`, …) rather than raw file writes — they enforce the path jail, hashing, trash-based deletes, and search indexing. (Do not confuse them with the keops-wiki tools of similar names.)

## Metadata schema

All formats share one schema. Required: `title`, `tags`. Everything else optional but encouraged.

```yaml
---
title: Attention Is All You Need — Notes   # human title, not the filename
tags: [transformers, attention]            # lowercase, singular nouns
summary: One-or-two-sentence description shown in cards and search.
created: 2026-08-03                        # YYYY-MM-DD (auto-filled on create)
updated: 2026-08-03                        # auto-bumped on every edit
status: draft                              # draft | final | archived
source: https://arxiv.org/abs/1706.03762   # only for ingested/external material
authors: [Vaswani et al.]                  # original authors, not you
---
```

Carriers per format (the tools handle this automatically via `meta` / `set_meta`):
- `.md` — YAML frontmatter (above).
- `.html` — `<title>` plus `<meta name="archive-tags" content="a, b">`, `archive-summary`, `archive-created`, `archive-updated`, `archive-status`, `archive-source`, `archive-authors` in `<head>`. Metadata lives inside the file so it stays self-contained.
- `.pdf` — sidecar `<name>.pdf.meta.json` holding the same fields as JSON. Managed only via `set_meta`; never listed or edited directly.

## Naming

- Filenames: `kebab-case`, short, descriptive: `attention-is-all-you-need.md`, `diffusion-schedules-explained.html`.
- NO dates in filenames — dates live in metadata.
- NO version suffixes (`-v2`, `-final`) — git and the version-safe tools are the history.

## Folder semantics

| Folder | Contents |
|---|---|
| `inbox/` | Unfiled: freshly ingested or quickly captured material awaiting triage |
| `notes/` | Your own writing: reading notes, ideas, how-tos, summaries (mostly `.md`) |
| `papers/` | Interactive `.html` papers and `.pdf` files, grouped in topical subfolders (`papers/transformers/`) |
| `reference/` | External documentation kept verbatim for reference |

Create topical subfolders freely (`notes/ml/`, `papers/optimization/`), but only when a folder would otherwise exceed ~10 docs.

## Tag style

- lowercase, singular, hyphenated when multiword: `transformer`, `reinforcement-learning`.
- **Always call `list_tags` first** and reuse an existing tag over inventing a near-duplicate (`llm` vs `llms` vs `language-model` — pick whichever already exists).
- 2–5 tags per doc. Tags describe topic, not format or status (those have their own fields).

## Choosing a format

- `.md` — default for everything written: notes, summaries, how-tos, references.
- `.html` — only when interactivity earns its keep (sliders, live charts, animations). Build with the `html-paper-builder` skill; never hand-roll the boilerplate.
- `.pdf` — only for externally produced artifacts (published papers, scans). Always attach metadata via `set_meta` immediately after adding one.

## Editing etiquette

- `read_doc` first; pass its `contentHash` as `baseHash`. On CONFLICT: re-read, merge, retry — never overwrite blindly.
- Prefer `edit_doc` (targeted replacements) over `update_doc` (full rewrite) for existing docs.
- One user request = one coherent set of edits; don't scatter micro-saves.
- Deletes go to `.trash/` via `delete_node` and are restorable with `move_node`; never bypass this.
