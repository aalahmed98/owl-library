---
name: library-maintenance
description: Maintain theArchive's health — triage the inbox, normalize tags, dedupe docs, re-sync design tokens in HTML papers, review trash. Use when asked to "clean up the archive", "organize the library", "fix tags", or on a periodic maintenance pass.
---

# Library Maintenance

Periodic housekeeping for theArchive. Read the **doc-conventions** skill first; use only **the-archive MCP tools** for changes. Work through whichever of these passes the user asked for (or all, for a full sweep), and report findings before making bulk changes.

## Passes

### 1. Inbox triage
`list_tree` on `inbox/`. For each doc: decide its proper home per folder semantics (notes/papers/reference), `move_node` it there, and fill any missing metadata via `set_meta`. Goal: empty inbox.

### 2. Tag normalization
`list_tags` and look for near-duplicates (`llm`/`llms`, `transformer`/`transformers`), style violations (uppercase, plural, spaces), and single-use stragglers that could merge into an existing tag. For each merge: `search` by the losing tag, then `set_meta` each doc with the corrected tag list. Report the merge map (old → new) before applying if more than ~5 docs are affected.

### 3. Dedupe sweep
For each doc title, `search` for close matches. Candidate pairs: read both, and if one supersedes the other, merge unique content into the keeper (`edit_doc`) and `delete_node` the loser. When unsure whether two docs are truly duplicates, ask — merging distinct notes loses information.

### 4. Token re-sync in papers
When `design/tokens.css` has changed: for every `.html` under `papers/`, `read_doc` and compare the block between `/* ==tokens== */` and `/* ==/tokens== */` with the current contents of `design/tokens.css` (Read it directly). If drifted, `edit_doc` replacing only the marked region (keep the markers). Also mirror the values into the paper's `prefers-color-scheme` fallback block if its variables drifted.

### 5. Metadata completeness
Walk `list_tree`; flag docs missing `summary`, `tags`, or (for ingested material) `source`. Fill what can be inferred from content via `set_meta`; list the rest for the user.

### 6. Trash review
`list_tree` on `.trash` is hidden, so use Bash `ls content/.trash/` (read-only). Report what's there with ages. **Purging is manual and user-only** — propose candidates older than ~30 days, but never delete anything from trash yourself.

## Rules

- Maintenance never changes the *meaning* of a doc — moves, tags, metadata, and token blocks only. Content merges (dedupe) always get user confirmation first.
- Batch report at the end: what moved, what merged, what was flagged.
