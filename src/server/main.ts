import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import path from "node:path";
import fs from "node:fs";
import { CONTENT_DIR, DESIGN_DIR, PUBLIC_DIR, PORT } from "../core/config.js";
import { ArchiveIndex } from "../core/search.js";
import { watchContent } from "../core/watch.js";
import { registerPageRoutes } from "./routes/pages.js";
import { registerApiRoutes } from "./routes/api.js";
import { registerRawRoutes } from "./routes/raw.js";

async function main(): Promise<void> {
  fs.mkdirSync(CONTENT_DIR, { recursive: true });

  const app = Fastify({ logger: { level: "warn" } });

  await app.register(fastifyStatic, { root: PUBLIC_DIR, prefix: "/assets/" });
  await app.register(fastifyStatic, { root: DESIGN_DIR, prefix: "/assets/design/", decorateReply: false });

  const index = new ArchiveIndex();
  const count = await index.buildFromDisk();
  console.log(`[archive] indexed ${count} docs from ${CONTENT_DIR}`);

  watchContent({
    onUpsert: (rel) => {
      void index.upsert(rel, { silent: true });
    },
    onRemove: (rel) => index.remove(rel),
  });

  registerPageRoutes(app, index);
  registerApiRoutes(app, index);
  registerRawRoutes(app);

  await app.listen({ port: PORT, host: "127.0.0.1" });
  console.log(`[archive] http://localhost:${PORT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
