// owl-library MCP server (stdio). CRITICAL: stdout is protocol-only — log to stderr.
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import fs from "node:fs";
import { CONTENT_DIR } from "../core/config.js";
import { ArchiveIndex } from "../core/search.js";
import { createMcpServer } from "./server.js";

async function main(): Promise<void> {
  fs.mkdirSync(CONTENT_DIR, { recursive: true });
  const server = createMcpServer(new ArchiveIndex());
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[owl-library] MCP server ready (content root: ${CONTENT_DIR})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
