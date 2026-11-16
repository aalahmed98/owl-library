// /new page: create a plain text doc, or a notes-mode doc (situation + raw
// bullets) which is saved first and then organized by the AI.
import { api } from "./actions.js";
import { uploadFiles, describeUploadError } from "./upload.js";

// must match NOTES_RAW_MARKER in src/server/organize.ts
const NOTES_RAW_MARKER = "<!-- notes-mode:raw -->";

const host = document.getElementById("new-doc");

if (host) {
  const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
  const titleEl = $<HTMLInputElement>("nd-title");
  const fileEl = $<HTMLInputElement>("nd-filename");
  const folderEl = $<HTMLSelectElement>("nd-folder");
  const tagsEl = $<HTMLInputElement>("nd-tags");
  const situationEl = $<HTMLTextAreaElement>("nd-situation");
  const notesEl = $<HTMLTextAreaElement>("nd-notes");
  const notesFields = $<HTMLDivElement>("nd-notes-fields");
  const hintEl = $<HTMLParagraphElement>("nd-hint");
  const createBtn = $<HTMLButtonElement>("nd-create");
  const statusEl = $<HTMLSpanElement>("nd-status");

  const kebab = (s: string): string =>
    s.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  const mode = (): string =>
    (document.querySelector<HTMLInputElement>('input[name="nd-mode"]:checked')?.value ?? "text");

  let filenameTouched = false;
  fileEl.addEventListener("input", () => (filenameTouched = fileEl.value.trim() !== ""));
  titleEl.addEventListener("input", () => {
    if (!filenameTouched) fileEl.value = kebab(titleEl.value) ? kebab(titleEl.value) + ".md" : "";
  });

  const uploadFields = $<HTMLDivElement>("nd-upload-fields");
  const textFields = $<HTMLDivElement>("nd-text-fields");
  const actionsEl = $<HTMLDivElement>("nd-actions");
  const dropzone = $<HTMLDivElement>("nd-dropzone");
  const fileInput = $<HTMLInputElement>("nd-file");
  const uploadList = $<HTMLUListElement>("nd-upload-list");

  const HINTS: Record<string, string> = {
    upload: "Add a finished document as it is: an interactive HTML page, a Markdown file or a PDF. You can also drop files onto any page of the library.",
    text: "A plain markdown document; you'll land in the editor.",
    notes: "Describe the situation, dump your raw bullets, and the AI organizes them: acronyms up top, logical flow, unclear fragments become open questions. Your raw notes are kept verbatim in an appendix.",
  };
  const applyMode = (): void => {
    const m = mode();
    uploadFields.hidden = m !== "upload";
    textFields.hidden = m === "upload";
    actionsEl.hidden = m === "upload";
    notesFields.hidden = m !== "notes";
    hintEl.textContent = HINTS[m] ?? "";
  };
  for (const r of document.querySelectorAll<HTMLInputElement>('input[name="nd-mode"]')) {
    r.addEventListener("change", applyMode);
  }
  if (new URLSearchParams(location.search).get("mode") === "upload") {
    const u = document.querySelector<HTMLInputElement>('input[name="nd-mode"][value="upload"]');
    if (u) u.checked = true;
  }
  applyMode();

  // keep the page-wide drop target in step with the folder chosen here
  const syncFolder = (): void => { document.body.dataset.uploadFolder = folderEl.value; };
  folderEl.addEventListener("change", syncFolder);
  syncFolder();

  async function handleFiles(files: File[]): Promise<void> {
    if (!files.length) return;
    dropzone.classList.add("is-busy");
    uploadList.innerHTML = "";
    const rows = files.map((f) => {
      const li = document.createElement("li");
      li.textContent = f.name;
      const st = document.createElement("span");
      st.className = "upload-state";
      st.textContent = "Uploading";
      li.append(st);
      uploadList.append(li);
      return { li, st };
    });
    const results = await uploadFiles(files, folderEl.value, (i, r) => {
      const row = rows[i];
      if (!row) return;
      row.li.classList.add(r.ok ? "is-done" : "is-failed");
      row.st.textContent = r.ok ? "Added" : describeUploadError(r.error);
    });
    dropzone.classList.remove("is-busy");
    const good = results.filter((r) => r.ok);
    if (good.length === files.length) {
      const first = good[0];
      location.href = good.length === 1 && first?.path
        ? `/doc/${encodeURI(first.path)}`
        : folderEl.value ? `/folder/${encodeURI(folderEl.value)}` : "/";
    }
  }

  dropzone.addEventListener("click", () => fileInput.click());
  dropzone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); }
  });
  fileInput.addEventListener("change", () => {
    void handleFiles([...(fileInput.files ?? [])]);
    fileInput.value = "";
  });
  // the page-wide drop overlay (upload.ts) hands files dropped on this page to the same list
  document.addEventListener("owl-upload-drop", (e) => {
    e.preventDefault();
    const upload = document.querySelector<HTMLInputElement>('input[name="nd-mode"][value="upload"]');
    if (upload) upload.checked = true;
    applyMode();
    void handleFiles((e as CustomEvent<File[]>).detail);
  });

  createBtn.addEventListener("click", async () => {
    const title = titleEl.value.trim();
    if (!title) return alert("Title is required.");
    let filename = (fileEl.value.trim() || kebab(title)) as string;
    if (!filename) return alert("File name is required.");
    if (!/\.md$/i.test(filename)) filename += ".md";
    const folder = folderEl.value;
    const path = folder ? `${folder}/${filename}` : filename;
    const tags = tagsEl.value.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
    const notesMode = mode() === "notes";

    let content = "";
    if (notesMode) {
      const situation = situationEl.value.trim();
      const notes = notesEl.value.trim();
      if (!situation) return alert("Notes mode needs a situation description.");
      if (!notes) return alert("Notes mode needs some notes.");
      content = `${NOTES_RAW_MARKER}\n\n## Situation\n\n${situation}\n\n## Raw notes\n\n${notes}\n`;
    }

    createBtn.disabled = true;
    statusEl.textContent = "Creating…";
    try {
      await api("/api/create", { path, content, meta: { title, tags, status: "draft" } });
    } catch (err) {
      createBtn.disabled = false;
      statusEl.textContent = "";
      return alert(`Create failed: ${err instanceof Error ? err.message : err}`);
    }

    if (!notesMode) {
      location.href = `/edit/${encodeURI(path)}`;
      return;
    }

    statusEl.textContent = "Raw notes saved. Organizing with Claude… (~1 min)";
    try {
      await api("/api/organize", { path });
      location.href = `/doc/${encodeURI(path)}`;
    } catch (err) {
      statusEl.innerHTML =
        `Organizing failed (${escText(err instanceof Error ? err.message : String(err))}). ` +
        `Your raw notes are saved; <a href="/doc/${encodeURI(path)}">open the doc</a> and hit Organize to retry.`;
      createBtn.disabled = false;
    }
  });

  function escText(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
}
