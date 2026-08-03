import chokidar from "chokidar";
import path from "node:path";
import { CONTENT_DIR, TRASH_DIR_NAME } from "./config.js";
import { toRelPath, isSidecar } from "./paths.js";

export interface WatchCallbacks {
  onUpsert: (rel: string) => void;
  onRemove: (rel: string) => void;
}

/**
 * Watch content/ for changes, ignoring .trash and dotfiles. Events are
 * debounced per-file (200ms) so editors that write twice don't double-index.
 * PDF sidecar changes are mapped to their PDF's path.
 */
export function watchContent(cb: WatchCallbacks): { close: () => Promise<void> } {
  const timers = new Map<string, NodeJS.Timeout>();

  const debounce = (key: string, fn: () => void) => {
    clearTimeout(timers.get(key));
    timers.set(key, setTimeout(() => { timers.delete(key); fn(); }, 200));
  };

  const mapRel = (absPath: string): string | null => {
    const rel = toRelPath(absPath);
    if (!rel || rel.split("/").some((seg) => seg.startsWith(".") || seg === TRASH_DIR_NAME)) return null;
    if (isSidecar(rel)) return rel.slice(0, -".meta.json".length);
    return rel;
  };

  const watcher = chokidar.watch(CONTENT_DIR, {
    ignored: (p: string) => {
      const base = path.basename(p);
      return p !== CONTENT_DIR && (base === TRASH_DIR_NAME || base.startsWith("."));
    },
    ignoreInitial: true,
    usePolling: process.env.CHOKIDAR_USEPOLLING === "1",
  });

  watcher.on("add", (p: string) => { const rel = mapRel(p); if (rel) debounce(rel, () => cb.onUpsert(rel)); });
  watcher.on("change", (p: string) => { const rel = mapRel(p); if (rel) debounce(rel, () => cb.onUpsert(rel)); });
  watcher.on("unlink", (p: string) => { const rel = mapRel(p); if (rel) debounce(rel, () => cb.onRemove(rel)); });

  return { close: () => watcher.close() };
}
