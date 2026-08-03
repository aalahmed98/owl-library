# theArchive

Personal archive for documentation and research papers (`.md`, self-contained interactive `.html` papers, `.pdf`), stored as plain files under `content/`, versioned with git.

- **Website** — local reader/browser/editor at http://localhost:7333
- **MCP server** (`the-archive`) — AI CRUD over docs and folders via Claude Code / Claude Desktop
- **Skills** — standardized doc conventions, interactive paper builder, research ingestion, library maintenance (`.claude/skills/`)

## Run

```bash
npm install
npm run dev        # website at http://localhost:7333 (watch mode)
npm run build      # build client bundles + dist/ (needed for Claude Desktop)
```

*(Full setup docs — MCP registration, Claude Desktop bridge — filled in below as they're built.)*
