// Archive mutations from the browser: move dialog, rename, new folder, and
// the "Organize" button on raw notes docs. Buttons are matched by js-* classes.

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function api<T = Record<string, unknown>>(pathname: string, body: unknown): Promise<T> {
  const res = await fetch(pathname, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

interface TreeJson {
  kind: "doc" | "folder";
  path: string;
  children?: TreeJson[];
}

async function folderPaths(): Promise<string[]> {
  const root = (await (await fetch("/api/tree")).json()) as TreeJson;
  const out: string[] = [""];
  const walk = (n: TreeJson): void => {
    for (const c of n.children ?? []) {
      if (c.kind === "folder") {
        out.push(c.path);
        walk(c);
      }
    }
  };
  walk(root);
  return out;
}

function goTo(path: string, kind: string): void {
  location.href = kind === "folder" ? `/folder/${encodeURI(path)}` : `/doc/${encodeURI(path)}`;
}

async function openMoveDialog(from: string, kind: string): Promise<void> {
  const folders = await folderPaths();
  // a folder can't move into itself or its own subtree
  const parent = from.includes("/") ? from.slice(0, from.lastIndexOf("/")) : "";
  const dests = folders.filter(
    (f) => f !== parent && (kind !== "folder" || (f !== from && !f.startsWith(from + "/"))),
  );
  const dlg = document.createElement("dialog");
  dlg.className = "move-dialog";
  dlg.innerHTML = `<h3>Move <code>${escHtml(from)}</code> to…</h3>
<div class="move-list">${dests.map((f) => `<button class="btn move-dest" data-dest="${escHtml(f)}">${f === "" ? "(root)" : escHtml(f)}</button>`).join("")}</div>
<form method="dialog"><button class="btn">Cancel</button></form>`;
  document.body.append(dlg);
  dlg.addEventListener("close", () => dlg.remove());
  for (const b of dlg.querySelectorAll<HTMLButtonElement>(".move-dest")) {
    b.addEventListener("click", async () => {
      const dest = b.dataset.dest ?? "";
      const base = from.split("/").pop() ?? from;
      const to = dest ? `${dest}/${base}` : base;
      try {
        await api("/api/move", { from, to });
        dlg.close();
        goTo(to, kind);
      } catch (err) {
        alert(`Move failed: ${err instanceof Error ? err.message : err}`);
      }
    });
  }
  dlg.showModal();
}

async function renameNode(from: string, kind: string): Promise<void> {
  const base = from.split("/").pop() ?? from;
  let next = prompt("Rename to:", base)?.trim();
  if (!next || next === base) return;
  if (kind !== "folder") {
    const ext = base.includes(".") ? base.slice(base.lastIndexOf(".")) : "";
    if (ext && !next.toLowerCase().endsWith(ext.toLowerCase())) next += ext;
  }
  const to = [...from.split("/").slice(0, -1), next].join("/");
  try {
    await api("/api/move", { from, to });
    goTo(to, kind);
  } catch (err) {
    alert(`Rename failed: ${err instanceof Error ? err.message : err}`);
  }
}

async function newFolder(parent: string): Promise<void> {
  const name = prompt("New folder name (kebab-case):")?.trim();
  if (!name) return;
  const path = parent ? `${parent}/${name}` : name;
  try {
    await api("/api/folder", { path });
    location.href = `/folder/${encodeURI(path)}`;
  } catch (err) {
    alert(`Create folder failed: ${err instanceof Error ? err.message : err}`);
  }
}

async function toggleSpace(btn: HTMLButtonElement): Promise<void> {
  const path = btn.dataset.path ?? "";
  const next = btn.dataset.next ?? "shared";
  btn.disabled = true;
  try {
    await api("/api/space", { path, space: next });
    location.reload();
  } catch (err) {
    alert(`Change failed: ${err instanceof Error ? err.message : err}`);
    btn.disabled = false;
  }
}

async function organize(btn: HTMLButtonElement): Promise<void> {
  const path = btn.dataset.path ?? "";
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Organizing… (~1 min)";
  try {
    await api("/api/organize", { path });
    location.reload();
  } catch (err) {
    alert(`Organize failed: ${err instanceof Error ? err.message : err}\nYour raw notes are untouched; you can retry.`);
    btn.disabled = false;
    btn.textContent = original;
  }
}

document.addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest?.("button");
  if (!btn) return;
  if (btn.classList.contains("js-move")) void openMoveDialog(btn.dataset.path ?? "", btn.dataset.kind ?? "doc");
  else if (btn.classList.contains("js-rename")) void renameNode(btn.dataset.path ?? "", btn.dataset.kind ?? "doc");
  else if (btn.classList.contains("js-newfolder")) void newFolder(btn.dataset.parent ?? "");
  else if (btn.classList.contains("js-organize")) void organize(btn as HTMLButtonElement);
  else if (btn.classList.contains("js-space")) void toggleSpace(btn as HTMLButtonElement);
});
