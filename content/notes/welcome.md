---
title: Welcome to theArchive
tags: [meta, how-to]
summary: What this archive is and how to work with it.
created: 2026-08-03
updated: 2026-08-03
status: final
---

# Welcome to theArchive

This is a personal library for documentation and research, stored as plain files under `content/` and versioned with git.

## The three formats

- **Markdown** (`.md`) — notes, summaries, references. Rendered with typography, math, and highlighted code. Editable right in the browser (hit **Edit** above).
- **Interactive papers** (`.html`) — self-contained pages with sliders and live charts, for when a concept deserves interaction. See the sampling-temperature explorer in `papers/`.
- **PDFs** — external papers kept verbatim, with metadata in a sidecar so they stay searchable.

## Working with AI

The `the-archive` MCP server gives Claude full control of this library: creating, editing, moving, tagging, and searching docs. Deletions go to `.trash/`, and every edit is hash-guarded so nothing gets clobbered.

Useful asks:

> "Ingest this paper: <url>" · "Build an interactive explainer for X" · "Clean up the archive"

## Search

Press <kbd>/</kbd> anywhere to search titles, tags, headings, and full text.
