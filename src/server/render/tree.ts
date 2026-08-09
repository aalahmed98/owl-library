import { FolderNode, TreeNode } from "../../core/tree.js";
import { esc } from "./layout.js";

function renderNode(node: TreeNode, activePath: string): string {
  if (node.kind === "doc") {
    const active = node.path === activePath ? " active" : "";
    return `<a class="tree-doc fmt-${node.format}${active}" href="/doc/${encodeURI(node.path)}" title="${esc(node.title)}">${esc(node.title)}</a>`;
  }
  const inner = node.children.map((c) => renderNode(c, activePath)).join("\n");
  const containsActive = activePath.startsWith(node.path + "/") || node.path === "";
  return `<details class="tree-folder" data-path="${esc(node.path)}"${containsActive ? " open" : ""}>
<summary>${esc(node.name)}</summary>
<div class="tree-children">
${inner || '<span class="tree-empty">empty</span>'}
</div>
</details>`;
}

export function renderSidebarTree(root: FolderNode, activePath = ""): string {
  const items = root.children.map((c) => renderNode(c, activePath)).join("\n");
  return `<div class="tree">\n${items || '<p class="tree-empty">No documents yet.</p>'}\n</div>`;
}
