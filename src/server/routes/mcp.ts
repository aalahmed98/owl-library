import type { FastifyInstance } from "fastify";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { ArchiveIndex } from "../../core/search.js";
import { createMcpServer } from "../../mcp/server.js";

// Stateless remote MCP endpoint: one server+transport per request, no session
// state kept between calls. Lets a remote agent (Claude Code/Desktop on someone
// else's machine) use the same tools/content the local stdio server exposes,
// backed by the site's live ArchiveIndex instead of a second copy.
export function registerMcpRoutes(app: FastifyInstance, index: ArchiveIndex): void {
  app.post("/mcp", async (req, reply) => {
    const server = createMcpServer(index);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    reply.hijack();
    await server.connect(transport);
    await transport.handleRequest(req.raw, reply.raw, req.body);
    await transport.close();
    await server.close();
  });

  app.get("/mcp", async (_req, reply) => {
    reply.code(405).send({ error: "stateless MCP endpoint: no server-initiated stream" });
  });

  app.delete("/mcp", async (_req, reply) => {
    reply.code(405).send({ error: "stateless MCP endpoint: no session to terminate" });
  });
}
