// owl-library MCP server (stdio). CRITICAL: stdout is protocol-only — log to stderr.
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import fs from "node:fs";
import { CONTENT_DIR } from "../core/config.js";
import { ArchiveIndex } from "../core/search.js";
import { createMcpServer } from "./server.js";

async function main(): Promise<void> {
  fs.mkdirSync(CONTENT_DIR, { recursive: true });
  // the local stdio server runs on the host's own machine, so it is the admin;
  // set ARCHIVE_ROLE=guest for a read-only local connection
  const role = process.env.ARCHIVE_ROLE === "guest" ? "guest" : "admin";
  const server = createMcpServer(new ArchiveIndex(), role);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[owl-library] MCP server ready (content root: ${CONTENT_DIR}, role: ${role})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
