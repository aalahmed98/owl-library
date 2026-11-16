// Uploading finished files (.html, .md, .pdf) as new docs, and the page-wide
// drag-and-drop target. Only active for the admin: the server marks the page
// with data-can-write and the folder that dropped files should land in.

const ALLOWED = [".html", ".htm", ".md", ".pdf"];
const MAX_BYTES = 12 * 1024 * 1024;

export interface UploadResult {
  ok: boolean;
  name: string;
  path?: string;
  error?: string;
}

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i).toLowerCase();
}

/** Base64 without blowing the call stack on large files. */
function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

export function describeUploadError(error: string | undefined): string {
  return error ? `Not added: ${error}` : "Not added";
}

async function uploadOne(file: File, folder: string): Promise<UploadResult> {
  if (!ALLOWED.includes(extOf(file.name))) {
    return { ok: false, name: file.name, error: "only HTML, Markdown and PDF files can be added" };
  }
  if (file.size > MAX_BYTES) return { ok: false, name: file.name, error: "the file is larger than 12 MB" };
  if (file.size === 0) return { ok: false, name: file.name, error: "the file is empty" };
  try {
    const res = await fetch("/api/upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ folder, filename: file.name, data: toBase64(await file.arrayBuffer()) }),
    });
    const data = (await res.json().catch(() => ({}))) as { path?: string; error?: string };
    if (!res.ok) return { ok: false, name: file.name, error: data.error ?? `the server answered ${res.status}` };
    return { ok: true, name: file.name, path: data.path };
  } catch {
    return { ok: false, name: file.name, error: "the connection dropped; try again" };
  }
}

/** Upload files one after another into `folder`, reporting each result as it lands. */
export async function uploadFiles(
  files: File[],
  folder: string,
  onResult?: (index: number, result: UploadResult) => void,
): Promise<UploadResult[]> {
  const out: UploadResult[] = [];
  for (const [i, file] of files.entries()) {
    const r = await uploadOne(file, folder);
    out.push(r);
    onResult?.(i, r);
  }
  return out;
}

// ── page-wide drop target ────────────────────────────
const body = document.body;

if (body.dataset.canWrite === "1") {
  const overlay = document.createElement("div");
  overlay.className = "drop-overlay";
  overlay.hidden = true;
  overlay.innerHTML = `<div class="drop-card">
  <p class="drop-title">Drop to add to the library</p>
  <p class="drop-where"></p>
  <p class="drop-status" role="status"></p>
</div>`;
  body.append(overlay);
  const whereEl = overlay.querySelector<HTMLElement>(".drop-where")!;
  const statusEl = overlay.querySelector<HTMLElement>(".drop-status")!;
  const titleEl = overlay.querySelector<HTMLElement>(".drop-title")!;

  const hasFiles = (e: DragEvent): boolean => [...(e.dataTransfer?.types ?? [])].includes("Files");
  const folder = (): string => body.dataset.uploadFolder ?? "";
  let depth = 0;
  let busy = false;

  const show = (): void => {
    titleEl.textContent = "Drop to add to the library";
    whereEl.textContent = folder() ? `Into the folder “${folder()}”` : "Into the top level of the library";
    statusEl.textContent = "HTML pages, Markdown and PDF, up to 12 MB each";
    overlay.classList.remove("is-failed");
    overlay.hidden = false;
  };
  const hide = (): void => {
    if (!busy) overlay.hidden = true;
  };

  window.addEventListener("dragenter", (e) => {
    if (!hasFiles(e) || busy) return;
    e.preventDefault();
    depth += 1;
    show();
  });
  window.addEventListener("dragover", (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
  });
  window.addEventListener("dragleave", (e) => {
    if (!hasFiles(e)) return;
    depth = Math.max(0, depth - 1);
    if (depth === 0) hide();
  });
  overlay.addEventListener("click", () => {
    if (!busy) overlay.hidden = true;
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !busy) overlay.hidden = true;
  });

  window.addEventListener("drop", (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    depth = 0;
    if (busy) return;
    const files = [...(e.dataTransfer?.files ?? [])];
    if (!files.length) return hide();

    // the New document page shows its own per-file list; let it take the files
    const handed = !document.dispatchEvent(new CustomEvent<File[]>("owl-upload-drop", { detail: files, cancelable: true }));
    if (handed) {
      overlay.hidden = true;
      return;
    }

    busy = true;
    titleEl.textContent = files.length === 1 ? "Adding 1 file" : `Adding ${files.length} files`;
    statusEl.textContent = "";
    void uploadFiles(files, folder(), (i, r) => {
      statusEl.textContent = `${i + 1} of ${files.length}: ${r.name}`;
    }).then((results) => {
      busy = false;
      const good = results.filter((r) => r.ok);
      const bad = results.filter((r) => !r.ok);
      if (!bad.length) {
        const first = good[0];
        location.href = good.length === 1 && first?.path
          ? `/doc/${encodeURI(first.path)}`
          : folder() ? `/folder/${encodeURI(folder())}` : "/";
        return;
      }
      overlay.classList.add("is-failed");
      titleEl.textContent = good.length ? `Added ${good.length}, ${bad.length} not added` : "Nothing was added";
      whereEl.textContent = bad.map((r) => `${r.name}: ${r.error ?? "failed"}`).join("\n");
      statusEl.textContent = good.length ? "Click anywhere to close, then refresh to see the new files." : "Click anywhere to close.";
    });
  });
}
