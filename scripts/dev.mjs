// Dev runner: esbuild --watch for client bundles + tsx watch for the server.
import { context } from "esbuild";
import { spawn } from "node:child_process";

const ctx = await context({
  entryPoints: ["src/client/app.ts", "src/client/editor.ts"],
  bundle: true,
  sourcemap: true,
  format: "iife",
  outdir: "public/js",
  logLevel: "info",
});
await ctx.watch();

const server = spawn("npx", ["tsx", "watch", "src/server/main.ts"], { stdio: "inherit" });

const shutdown = async () => {
  server.kill("SIGTERM");
  await ctx.dispose();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
server.on("exit", (code) => process.exit(code ?? 0));
