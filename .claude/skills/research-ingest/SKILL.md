---
name: research-ingest
description: Ingest external research into owl-library — given a PDF file, URL, or pasted text, produce a summarized, tagged, correctly filed doc. Use when asked to "add this paper", "save this article", "ingest", or when handed a PDF/link destined for the archive.
---

# Research Ingestion

Turn external material (PDF / URL / pasted text) into properly filed archive content. Follow the **doc-conventions** skill for all naming, metadata, and folder rules, and use only **owl-library MCP tools** for writes.

## Workflow

1. **Acquire the text.**
   - URL → WebFetch the page. If it's an arXiv abstract page, also note the PDF link.
   - PDF on disk → try `pdftotext <file> -` (poppler) via Bash; if unavailable or the output is garbage (scanned PDF), Read the PDF directly.
   - Pasted text → use as-is.
2. **Check for duplicates**: `search` the archive for the title and key terms. If it already exists, update/extend the existing doc instead of creating a twin.
3. **File the original artifact** (when there is one):
   - PDF: copy it into `content/papers/<topic>/<kebab-name>.pdf` (Bash `cp` is fine for the binary itself), then immediately `set_meta` with title, tags, summary, `source`, `authors`.
   - URL-only sources: no artifact to store; the summary doc's `source` field carries the link.
4. **Write the summary doc** with `create_doc` at `notes/<kebab-name>.md` (or `inbox/` if genuinely unsure where it belongs):
   - Frontmatter per conventions; `source` = origin URL; `authors` = original authors; `status: final` once the summary is complete.
   - Body structure: **TL;DR** (2–4 sentences) → **Key ideas** (bulleted) → **Method/details** (as deep as the material warrants) → **Relevance** (why it's in the archive, links to related archive docs) → **Open questions**.
5. **Tag consistently**: `list_tags` first; reuse existing tags; 2–5 tags shared between the PDF and its summary doc so they surface together.
6. **Report** the created paths and a one-line description of each.

## Rules

- Never leave an ingested artifact without metadata — an untagged PDF is invisible to search.
- Summary docs are `.md`. Only build an interactive `.html` explainer (html-paper-builder skill) when explicitly asked.
- Big batches: process items one at a time, completing filing + metadata before the next; report a table at the end.
- If extraction fails (paywall, scan, corrupt file), file what you can into `inbox/` with a `status: draft` note explaining what's missing — never silently drop material.
