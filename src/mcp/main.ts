// owl-library MCP server (stdio). CRITICAL: stdout is protocol-only — log to stderr.
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import fs from "node:fs";
import { CONTENT_DIR } from "../core/config.js";
import { ArchiveIndex } from "../core/search.js";
import { createMcpServer } from "./server.js";

async function main(): Promise<void> {
  fs.mkdirSync(CONTENT_DIR, { recursive: true });
  // local stdio server runs as the host's identity; override with ARCHIVE_IDENTITY=ali
  const identity = process.env.ARCHIVE_IDENTITY === "ali" ? "ali" : "haman";
  const server = createMcpServer(new ArchiveIndex(), identity);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[owl-library] MCP server ready (content root: ${CONTENT_DIR}, identity: ${identity})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
