---
title: Getting Started with Owl Library
tags: [setup, guide, mcp]
summary: How to sign in, understand private vs shared docs, connect your own Claude, and install the library skills.
created: '2026-08-09'
updated: '2026-08-09'
status: final
space: shared
---

Welcome to Owl Library, a private research library shared by Haman and Ali. This doc covers everything a new user needs.

## 1. Signing in

1. Open **https://archive.owl-library.com** and enter the library password (ask Haman if you don't have it).
2. Pick who you are: **Haman** or **Ali**.
3. On your first visit you'll set a **personal password** (minimum 4 characters, entered twice). Only a salted hash is stored on the server, so nobody can read your password back, including the host. Every later visit asks for it.

Your identity is fixed for the session. To switch person, log out with the Log out button in the header and sign in again.

## 2. Private vs shared docs

Every doc is either **private** or **shared**:

- **Private**: only its owner sees it. For the other person it doesn't exist anywhere: not in the sidebar, folders, search, or by direct link.
- **Shared**: visible to both of you (like this doc).

The home page shows both groups. On any doc you can open, the **Make shared / Make private** button flips it. "Make private" makes the doc *yours* privately, whoever owned it before. New docs default to private, so nothing goes public by accident.

## 3. Connect your own Claude

Your Claude (Code or Desktop) can read, search, create, and edit docs in this library directly, with the same visibility you have on the website: your private docs plus shared ones, never the other person's private docs.

Claim your identity on the website first (step 1), then:

**Claude Code** (swap in your name and personal password):

```bash
claude mcp add --transport http owl-library https://archive.owl-library.com/mcp --header "Authorization: Bearer ali:<your-personal-password>"
```

**Claude Desktop**: Settings → Connectors → Add custom connector → URL `https://archive.owl-library.com/mcp` with header `Authorization: Bearer ali:<your-personal-password>`.

Available tools: `list_tree`, `read_doc`, `create_doc`, `update_doc`, `edit_doc`, `set_meta`, `delete_node` (goes to trash, never hard-deleted), `move_node`, `create_folder`, `search`, `list_tags`. Docs your Claude creates default to private; it can pass `space: "shared"` to share them.

## 4. Install the library skills

The library ships four Claude skills (doc conventions, interactive paper builder, research ingestion, maintenance passes) so your Claude files and formats docs the same way everyone else's does. From the root of the local folder your Claude Code session uses:

```bash
mkdir -p .claude && curl -sL https://archive.owl-library.com/assets/downloads/skills.tar.gz | tar -xz -C .claude/
```

## Good to know

- **Forgot your personal password?** There's no self-service reset: ask the host to clear your entry in `.auth.json` on the server, then set a new one at the picker. Update your MCP connector header afterwards.
- **Folder names are visible to both people.** Only docs hide; a folder holding only the other person's private docs just looks empty.
- **Edits are live.** Browser and Claude edits write to the same files and the same search index instantly. Conflicting edits are rejected (re-read and retry), never silently overwritten.
- **Server restarts log you out** of the website; MCP connectors keep working.
