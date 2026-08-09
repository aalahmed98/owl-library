# Connecting to owl-library

owl-library is hosted at **https://archive.owl-library.com**, gated by Cloudflare Access (email login). This guide is for a second person setting up access from their own machine — three steps, no local install required.

## 1. Website access

Open https://archive.owl-library.com — the first visit prompts a Cloudflare Access login (your email must be on the allowlist; ask the owner if you're not in yet). Once logged in you can browse, search, and create/edit docs directly in the browser.

## 2. Connect your own Claude

This points your own Claude at the *same* live server — same content, same search index, same conflict protection. No separate copy, nothing to sync.

**Claude Code:**
```bash
claude mcp add --transport http owl-library https://archive.owl-library.com/mcp
```

**Claude Desktop:** Settings → Connectors → Add custom connector → URL `https://archive.owl-library.com/mcp`

The first tool call triggers the same Access login in-browser.

Once connected, your Claude has full read/write access to the archive:
`list_tree`, `read_doc`, `create_doc`, `update_doc`, `edit_doc`, `set_meta`, `delete_node` (→ trash, never hard-deleted), `move_node`, `create_folder`, `search`, `list_tags`.

## 3. Get the skills

These teach your Claude the archive's conventions (naming, frontmatter, folder rules, how to build interactive papers, how to ingest research, how to do maintenance passes) so edits from your Claude look the same as edits from the owner's.

```bash
mkdir -p .claude && curl -sL https://archive.owl-library.com/assets/downloads/skills.tar.gz | tar -xz -C .claude/
```

Run this from the root of whatever local folder your Claude Code session uses. It drops four skills into `.claude/skills/`: `doc-conventions`, `html-paper-builder`, `research-ingest`, `library-maintenance`.

## What "connected" means in practice

Every edit — whether typed in the browser or made by your Claude through the MCP tools above — writes straight to the one live `content/` directory on the host and updates the one live search index. There's no draft/staging copy and no export/import step. If two edits collide (someone else changed the doc since you last read it), the write is rejected with a conflict instead of silently overwriting — re-read and retry.
