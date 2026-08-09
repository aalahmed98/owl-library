// Notes-mode organizer: turn a raw notes doc (situation + hastily-typed
// bullets) into an organized study doc via the local `claude` CLI (headless).
import { spawn } from "node:child_process";
import os from "node:os";
import matter from "gray-matter";
import { readDoc, updateDoc } from "../core/docs.js";
import { DocMeta, stringifyMd } from "../core/meta.js";

/** Marks a doc body as un-organized raw notes. Must match the client copy in src/client/newdoc.ts. */
export const NOTES_RAW_MARKER = "<!-- notes-mode:raw -->";

export function isRawNotesDoc(content: string): boolean {
  return content.includes(NOTES_RAW_MARKER);
}

function parseRaw(body: string): { situation: string; notes: string } {
  const sit = /## Situation\s*\n([\s\S]*?)\n## Raw notes/.exec(body);
  const nts = /## Raw notes\s*\n([\s\S]*)$/.exec(body);
  if (!sit || !nts) {
    throw new Error("raw notes doc must contain '## Situation' and '## Raw notes' sections");
  }
  return { situation: (sit[1] ?? "").trim(), notes: (nts[1] ?? "").trim() };
}

function buildPrompt(title: string, situation: string, notes: string): string {
  return `You are organizing rough, hastily-typed learning notes into a clean study document titled "${title}".

CONTEXT — the situation in which the notes were taken:
${situation}

RAW NOTES — verbatim, typed fast; expect typos, mishearings, and fragments:
${notes}

Produce a well-organized markdown document body following these rules, in this order:

1. Start with a section "## Acronyms & terms": a table of every acronym or piece of jargon that appears in (or is clearly implied by) the notes, with its expansion and a one-line meaning. When a note misspells or mishears a term (e.g. "SOFA" where the context clearly means SOFR), use the correct term and record the correction in this table.
2. Then reorganize the note content into a logical flow under ## / ### headings: group related points, order them so ideas build on each other, and rewrite fragments as complete sentences. Preserve the author's meaning, examples, and numbers exactly; fix obvious typos and mishearings.
3. You may add short clarifying glue where the notes clearly imply it, but every piece of content that is YOUR addition rather than the author's must be marked inline as *(AI: ...)*.
4. Do NOT invent facts, numbers, or claims that are not in the notes. If a fragment is undecipherable or ambiguous, do NOT guess silently: put it in a final section "## Open questions", quoting the fragment verbatim and asking the author what was meant.
5. Output ONLY the markdown body — no top-level # title (it is rendered separately), no preamble, no code fence around the whole document, no commentary.`;
}

export function runClaude(prompt: string, timeoutMs = 240_000): Promise<string> {
  return new Promise((resolve, reject) => {
    // cwd = tmpdir so the CLI doesn't load this repo's project context
    const child = spawn("claude", ["-p", "--output-format", "text"], {
      cwd: os.tmpdir(),
      stdio: ["pipe", "pipe", "pipe"],
    });
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`claude CLI timed out after ${Math.round(timeoutMs / 1000)}s`));
    }, timeoutMs);
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(new Error(`could not launch claude CLI: ${e.message}`));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) return reject(new Error(`claude CLI exited ${code}: ${err.trim().slice(0, 500)}`));
      if (!out.trim()) return reject(new Error("claude CLI returned empty output"));
      resolve(out.trim());
    });
    child.stdin.write(prompt);
    child.stdin.end();
  });
}

/**
 * Organize a raw notes doc in place: AI-organized body on top, the verbatim
 * raw notes preserved as a collapsed appendix (composed server-side, never
 * trusted to the model). Concurrency-safe via the doc's contentHash.
 */
export async function organizeNotesDoc(relPath: string): Promise<{ path: string }> {
  const doc = await readDoc(relPath);
  if (doc.format !== "md") throw new Error("only markdown docs can be organized");
  const { content: body } = matter(doc.content);
  if (!isRawNotesDoc(body)) throw new Error("not a raw notes doc (marker missing)");
  const { situation, notes } = parseRaw(body);

  let organized = await runClaude(buildPrompt(doc.meta.title, situation, notes));
  // strip a single wrapping code fence if the model added one anyway
  const fenced = /^```(?:markdown|md)?\n([\s\S]*)\n```$/.exec(organized);
  if (fenced) organized = (fenced[1] ?? "").trim();

  const appendix = `<details>
<summary>Raw notes (verbatim)</summary>

### Situation

${situation}

### Notes as typed

\`\`\`
${notes}
\`\`\`

</details>`;

  const meta: DocMeta = { ...doc.meta };
  if (!meta.summary) meta.summary = situation.replace(/\s+/g, " ").slice(0, 160);
  const nextContent = stringifyMd(meta, `${organized}\n\n---\n\n${appendix}\n`);
  const res = await updateDoc(relPath, nextContent, doc.contentHash);
  return { path: res.path };
}
