import { unified, type Processor } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeKatex from "rehype-katex";
import rehypeShiki from "@shikijs/rehype";
import rehypeStringify from "rehype-stringify";
import { visit } from "unist-util-visit";
import type { Root as HastRoot, Element } from "hast";
import matter from "gray-matter";

export interface TocEntry {
  id: string;
  text: string;
  depth: 2 | 3;
}

export interface RenderedMarkdown {
  html: string;
  toc: TocEntry[];
}

function hastText(node: Element): string {
  let out = "";
  visit(node, "text", (t: { value: string }) => {
    out += t.value;
  });
  return out;
}

let processorPromise: Promise<Processor> | null = null;
let collectedToc: TocEntry[] = [];

function rehypeCollectToc() {
  return (tree: HastRoot) => {
    visit(tree, "element", (node: Element) => {
      if ((node.tagName === "h2" || node.tagName === "h3") && node.properties?.id) {
        collectedToc.push({
          id: String(node.properties.id),
          text: hastText(node),
          depth: node.tagName === "h2" ? 2 : 3,
        });
      }
    });
  };
}

function getProcessor(): Promise<Processor> {
  processorPromise ??= (async () =>
    unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkMath)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(rehypeSlug)
      .use(rehypeCollectToc)
      .use(rehypeKatex)
      .use(rehypeShiki, {
        themes: { light: "github-light", dark: "github-dark" },
        defaultColor: "light-dark()",
      })
      .use(rehypeStringify) as unknown as Processor)();
  return processorPromise;
}

// Renders are serialized because the shared processor writes TOC entries into
// module state; concurrent renders would interleave their TOCs.
let renderChain: Promise<unknown> = Promise.resolve();

/** Render a raw .md file (frontmatter included) to HTML + TOC. */
export function renderMarkdown(src: string): Promise<RenderedMarkdown> {
  const run = renderChain.then(async (): Promise<RenderedMarkdown> => {
    const { content } = matter(src);
    const processor = await getProcessor();
    collectedToc = [];
    const file = await processor.process(content);
    const toc = collectedToc;
    collectedToc = [];
    return { html: String(file), toc };
  });
  renderChain = run.catch(() => {});
  return run;
}
