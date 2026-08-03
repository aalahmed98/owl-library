// Vendor KaTeX CSS + fonts into public/vendor/katex so pages work offline.
import { cp, mkdir, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dest = join(root, "public", "vendor", "katex");

let katexDist;
try {
  const require = createRequire(import.meta.url);
  katexDist = dirname(require.resolve("katex/dist/katex.min.css"));
} catch {
  console.log("[copy-katex] katex not installed yet; skipping.");
  process.exit(0);
}

await mkdir(dest, { recursive: true });
await cp(join(katexDist, "katex.min.css"), join(dest, "katex.min.css"));
await cp(join(katexDist, "fonts"), join(dest, "fonts"), { recursive: true });
try {
  await access(join(dest, "katex.min.css"));
  console.log("[copy-katex] vendored katex assets into public/vendor/katex");
} catch {
  console.error("[copy-katex] copy appears to have failed");
  process.exit(1);
}
