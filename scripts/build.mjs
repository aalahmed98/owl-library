// Build client bundles (esbuild) + compile server/mcp to dist/ (tsc).
import { build } from "esbuild";
import { execSync } from "node:child_process";

await Promise.all([
  build({
    entryPoints: ["src/client/app.ts", "src/client/editor.ts"],
    bundle: true,
    minify: true,
    format: "iife",
    outdir: "public/js",
    logLevel: "info",
  }),
]);

execSync("npx tsc -p tsconfig.build.json", { stdio: "inherit" });

execSync("mkdir -p public/downloads && tar -czf public/downloads/skills.tar.gz -C .claude skills", { stdio: "inherit" });
console.log("[build] done — client bundles in public/js, server in dist/, skills bundle in public/downloads/");
