// CodeMirror 6 markdown editor with optimistic-lock saves (baseHash / 409).
import { basicSetup, EditorView } from "codemirror";
import { keymap } from "@codemirror/view";
import { markdown } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";
import { Compartment } from "@codemirror/state";

const host = document.getElementById("editor");
const saveBtn = document.getElementById("editor-save") as HTMLButtonElement | null;
const statusEl = document.getElementById("editor-status");
const conflictEl = document.getElementById("editor-conflict");
const reloadBtn = document.getElementById("editor-reload");

async function init(): Promise<void> {
  if (!host) return;
  const docPath = host.dataset.path!;
  const res = await fetch(`/api/doc?path=${encodeURIComponent(docPath)}`);
  if (!res.ok) {
    host.textContent = "Failed to load document.";
    return;
  }
  let { content, hash } = (await res.json()) as { content: string; hash: string };
  let dirty = false;

  const themeCompartment = new Compartment();
  const isDark = () => document.documentElement.dataset.theme === "dark";

  const setStatus = (msg: string) => {
    if (statusEl) statusEl.textContent = msg;
  };

  const view = new EditorView({
    parent: host,
    doc: content,
    extensions: [
      basicSetup,
      markdown(),
      EditorView.lineWrapping,
      themeCompartment.of(isDark() ? oneDark : []),
      EditorView.updateListener.of((u) => {
        if (u.docChanged && !dirty) {
          dirty = true;
          setStatus("unsaved changes");
        }
      }),
      keymap.of([
        {
          key: "Mod-s",
          run: () => {
            void save();
            return true;
          },
        },
      ]),
    ],
  });

  // follow the app theme toggle live
  new MutationObserver(() => {
    view.dispatch({ effects: themeCompartment.reconfigure(isDark() ? oneDark : []) });
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  async function save(): Promise<void> {
    setStatus("saving…");
    const body = { path: docPath, content: view.state.doc.toString(), baseHash: hash };
    const r = await fetch("/api/doc", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (r.status === 409) {
      if (conflictEl) conflictEl.hidden = false;
      setStatus("conflict — file changed on disk");
      return;
    }
    if (!r.ok) {
      setStatus(`save failed (${r.status})`);
      return;
    }
    const data = (await r.json()) as { hash: string };
    hash = data.hash;
    dirty = false;
    if (conflictEl) conflictEl.hidden = true;
    setStatus("saved");
  }

  saveBtn?.addEventListener("click", () => void save());

  reloadBtn?.addEventListener("click", async () => {
    const r = await fetch(`/api/doc?path=${encodeURIComponent(docPath)}`);
    if (!r.ok) return;
    const data = (await r.json()) as { content: string; hash: string };
    hash = data.hash;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: data.content } });
    dirty = false;
    if (conflictEl) conflictEl.hidden = true;
    setStatus("reloaded latest from disk");
  });

  window.addEventListener("beforeunload", (e) => {
    if (dirty) e.preventDefault();
  });
}

void init();
