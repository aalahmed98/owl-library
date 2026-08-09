# Connecting to owl-library

owl-library is hosted at **https://archive.owl-library.com**. This guide is for anyone setting up access from their own machine — no local install required.

## 1. Website access

1. Open https://archive.owl-library.com and enter the **library password** (ask the owner).
2. Pick who you are — **Haman** or **Ali**.
3. First visit: set a **personal password** (min 4 chars, entered twice). Only a salted hash is stored on the server — nobody, including the host, can read it back. After that, every visit asks for it.

Your identity is fixed for the session; to switch person, log out (⏻ in the header) and go through the flow again.

### Private vs shared

Every doc is either **private** (only its owner sees it — it doesn't exist for the other person: not in the sidebar, folders, search, or by direct link) or **shared** (both of you). The home page shows both groups. On any doc you can see, use the **Make shared / Make private** button to flip it — "Make private" makes it *yours* privately, whoever owned it before. New docs default to private.

## 2. Connect your own Claude

This points your own Claude at the *same* live server — same content, same search index, same conflict protection, and the **same visibility**: your Claude sees your private docs plus shared ones, never the other person's private docs.

> Requires step 1 first — the MCP password is your personal password, so claim your identity on the website before connecting.

**Claude Code** (replace `ali` and the password with your own):
```bash
claude mcp add --transport http owl-library https://archive.owl-library.com/mcp --header "Authorization: Bearer ali:<your-personal-password>"
```

**Claude Desktop:** Settings → Connectors → Add custom connector → URL `https://archive.owl-library.com/mcp`, header `Authorization: Bearer ali:<your-personal-password>`.

Tools: `list_tree`, `read_doc`, `create_doc`, `update_doc`, `edit_doc`, `set_meta` (its `space` field takes `private`/`shared`), `delete_node` (→ trash, never hard-deleted), `move_node`, `create_folder`, `search`, `list_tags`. Docs your Claude creates default to private; pass `space: "shared"` to share.

## 3. Get the skills

These teach your Claude the archive's conventions (naming, frontmatter, folder rules, interactive papers, research ingestion, maintenance passes) so its edits look the same as everyone else's.

```bash
mkdir -p .claude && curl -sL https://archive.owl-library.com/assets/downloads/skills.tar.gz | tar -xz -C .claude/
```

Run this from the root of whatever local folder your Claude Code session uses. It drops four skills into `.claude/skills/`: `doc-conventions`, `html-paper-builder`, `research-ingest`, `library-maintenance`.

## What "connected" means in practice

Every edit — browser or Claude-via-MCP — writes straight to the one live `content/` directory on the host and updates the one live search index. No draft copy, no sync step. If two edits collide (the doc changed since you last read it), the write is rejected with a conflict instead of silently overwriting — re-read and retry.

## Notes & limits

- **Forgot your personal password?** There's no reset flow — the host deletes your entry from `.auth.json` on the server and you set a new one at the picker. (Old MCP connector headers stop working until updated.)
- **Folder names are visible to both people** — only docs are hidden. A folder holding only the other person's private docs just looks empty.
- **The library password is a soft outer gate** (shared, not rate-limited). Real per-person separation comes from the personal passwords, but treat the site as "small trusted circle", not hardened multi-tenant hosting.
- Server restarts log everyone out of the website (sessions are in-memory); MCP connectors are unaffected.
