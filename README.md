# owl-library

Personal archive for documentation and research papers (`.md`, self-contained interactive `.html` papers, `.pdf`), stored as plain files under `content/`, versioned with git.

- **Website** — local reader/browser/editor at http://localhost:7333
- **MCP server** (`owl-library`) — AI CRUD over docs and folders via Claude Code / Claude Desktop
- **Skills** — standardized doc conventions, interactive paper builder, research ingestion, library maintenance (`.claude/skills/`)

## Run the website

```bash
npm install
npm run dev        # http://localhost:7333 (watch mode: server + client bundles)
npm run build      # client bundles + compiled dist/ (required for Claude Desktop)
npm start          # run the built server from dist/
```

## Content layout

```
content/
  inbox/       # unfiled / freshly ingested material
  notes/       # your own writing (mostly .md)
  papers/      # interactive .html papers and .pdf files
  reference/   # external docs kept for reference
  .trash/      # soft-deleted items (never auto-purged; restore by moving out)
```

Metadata: `.md` uses YAML frontmatter; `.html` uses `<title>` + `<meta name="archive-*">` tags (files stay self-contained); `.pdf` uses a `<name>.pdf.meta.json` sidecar. See `.claude/skills/doc-conventions/SKILL.md` for the schema.

## MCP: Claude Code

Registered via the project's `.mcp.json` — just open Claude Code in this repo and approve the `owl-library` server. Tools: `list_tree`, `read_doc`, `create_doc`, `update_doc`, `edit_doc`, `set_meta`, `delete_node` (→ trash), `move_node`, `create_folder`, `search`, `list_tags`.

Safety model: all paths are jailed to `content/`; deletes go to `content/.trash/`; every content write requires the `contentHash` from a fresh `read_doc`, so concurrent edits (e.g. the browser editor) are rejected as conflicts instead of clobbered.

## MCP: Claude Desktop (Windows + WSL)

Claude Desktop runs on Windows; this repo lives in WSL. The bridge is `bin/mcp.sh`, launched through `wsl.exe`.

1. Build once (Desktop runs the compiled output): `npm run build`
2. Add to `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "owl-library": {
      "command": "wsl.exe",
      "args": ["-d", "Ubuntu", "-e", "/home/haman/nbb/owl-library/bin/mcp.sh"]
    }
  }
}
```

3. Restart Claude Desktop; the `owl-library` tools should appear.

**Caveats**
- `bin/mcp.sh` hardcodes the nvm node path (`~/.nvm/versions/node/v22.22.3/bin/node`) because `wsl.exe -e` runs a bare shell without nvm. After a Node upgrade, update that path.
- Re-run `npm run build` after changing `src/core` or `src/mcp` so Desktop picks up the new code (Claude Code uses `tsx` and always runs the latest source).
- Sanity check from a Windows terminal: `wsl.exe -d Ubuntu -e /home/haman/nbb/owl-library/bin/mcp.sh`, then paste one line: `{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"t","version":"0"}}}` — you should get a single-line JSON reply.

## Remote access (second user, own machine)

Site is hosted at `https://archive.owl-library.com`, behind Cloudflare Access (email login gate). See **[SETUP.md](SETUP.md)** for the connect-your-own-Claude walkthrough.

## Troubleshooting

- **File changes not picked up by search**: the watcher uses inotify, which works on native WSL paths. If content ever lives under `/mnt/c/...`, start with `CHOKIDAR_USEPOLLING=1 npm run dev`.
- **Port conflict**: set `ARCHIVE_PORT` (default 7333).
- **MCP server silent in Desktop**: check nothing writes to stdout (all logging must use stderr) and that `dist/` exists and is current.
