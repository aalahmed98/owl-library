# Connecting to owl-library

owl-library is hosted at **https://archive.owl-library.com**. This guide is for anyone setting up access from their own machine — no local install required.

## 1. Website access

There are two ways to sign in, each with its own password. There are no user accounts.

| Sign in as | What you can do | Password |
|---|---|---|
| **Admin** | Everything: create, edit, move, rename and remove any doc or folder | Only the owner has it |
| **Guest** | Read only: browse, read and search | Ask the owner |

1. Open https://archive.owl-library.com.
2. Choose **Guest** or **Admin**, enter that password, and press Enter.

To switch between the two, log out (in the header) and sign in again.

Removing a doc or folder moves it to a trash folder on the server. Nothing is erased, and the owner can restore it.

## 2. Connect your own Claude

This points your own Claude at the *same* live server — same content, same search index, same conflict protection, and the **same permissions** as the website.

**Claude Code** (use `guest` or `admin` and that role's password):
```bash
claude mcp add --transport http owl-library https://archive.owl-library.com/mcp --header "Authorization: Bearer guest:<the-guest-password>"
```

**Claude Desktop:** Settings → Connectors → Add custom connector → URL `https://archive.owl-library.com/mcp`, header `Authorization: Bearer guest:<the-guest-password>`.

A **guest** connection gets the read tools only: `list_tree`, `read_doc`, `search`, `list_tags`.

An **admin** connection also gets the write tools: `create_doc`, `update_doc`, `edit_doc`, `set_meta`, `delete_node` (→ trash, never hard-deleted), `move_node`, `create_folder`.

## 3. Get the skills

These teach your Claude the archive's conventions (naming, frontmatter, folder rules, interactive papers, research ingestion, maintenance passes) so its edits look the same as everyone else's.

```bash
mkdir -p .claude && curl -sL https://archive.owl-library.com/assets/downloads/skills.tar.gz | tar -xz -C .claude/
```

Run this from the root of whatever local folder your Claude Code session uses. It drops four skills into `.claude/skills/`: `doc-conventions`, `html-paper-builder`, `research-ingest`, `library-maintenance`.

## What "connected" means in practice

Every admin edit — browser or Claude-via-MCP — writes straight to the one live `content/` directory on the host and updates the one live search index. No draft copy, no sync step. If two edits collide (the doc changed since you last read it), the write is rejected with a conflict instead of silently overwriting — re-read and retry.

## Notes & limits

- **The host sets both passwords** in environment variables on the server: `ARCHIVE_ADMIN_PASSWORD` and `ARCHIVE_GUEST_PASSWORD`. Each must be at least 12 characters and the two must be different. There are no defaults: a role whose password is missing cannot sign in.
- **Changing a password** means changing the variable on the server and restarting it. Connectors using the old password stop working until updated.
- **Wrong guesses lock you out for a while.** Five wrong passwords from one address, on the website or the MCP endpoint, block that address for 15 minutes. Twenty-five wrong guesses at one role from anywhere block new addresses for 15 minutes; addresses that have signed in before keep working.
- **Guests really are read-only.** The server refuses every change from a guest session, not just the buttons.
- Server restarts log everyone out of the website (sessions are in-memory); MCP connectors are unaffected.
