// Watches the project's inputs. Folders get a recursive fs.watch; files are watched through their
// parent folder (editors often replace files, which kills a watcher on the file itself). Anything
// fs.watch cannot handle falls back to polling a modification signature, which also notices paths
// that appear after the start.
import { existsSync, type FSWatcher, readdirSync, statSync, watch } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import type { WatchEntry } from "../watch-paths.ts";

const POLL_MS = 1000;
const MAX_ENTRIES = 5000;

/** Names, mtimes and sizes under `path` (bounded), so a change, creation or deletion alters it. */
const signature = (path: string): string => {
  const out: string[] = [];
  const walk = (p: string): void => {
    if (out.length > MAX_ENTRIES) return;
    const st = statSync(p, { throwIfNoEntry: false });
    if (!st) return;
    out.push(`${p}:${st.mtimeMs}:${st.size}`);
    if (st.isDirectory()) for (const name of readdirSync(p)) walk(join(p, name));
  };
  walk(path);
  return out.join("|") || "-";
};

export interface WatchOptions {
  readonly root: string;
  readonly entries: readonly WatchEntry[];
  readonly onChange: (relPath: string) => void;
}

const tryWatch = (
  dir: string,
  recursive: boolean,
  onEvent: (file: string) => void,
): FSWatcher | undefined => {
  try {
    if (!statSync(dir).isDirectory()) return undefined;
    const w = watch(dir, { recursive, persistent: true }, (_event, file) =>
      onEvent(file === null ? "" : String(file)),
    );
    w.on("error", () => w.close());
    return w;
  } catch {
    return undefined;
  }
};

/** Starts watching; returns a function that stops everything. */
export const watchProject = (o: WatchOptions): (() => void) => {
  const emit = (abs: string): void => o.onChange(relative(o.root, abs).replaceAll("\\", "/"));
  const watchers: FSWatcher[] = [];
  const polled: { abs: string; sig: string }[] = [];
  for (const e of o.entries) {
    const abs = join(o.root, e.path);
    const w =
      e.kind === "dir"
        ? existsSync(abs) && tryWatch(abs, true, (f) => emit(f ? join(abs, f) : abs))
        : tryWatch(dirname(abs), false, (f) => {
            if (f === "" || basename(f) === basename(abs)) emit(abs);
          });
    if (w) watchers.push(w);
    else polled.push({ abs, sig: signature(abs) });
  }
  const timer = setInterval(() => {
    for (const p of polled) {
      const sig = signature(p.abs);
      if (sig === p.sig) continue;
      p.sig = sig;
      emit(p.abs);
    }
  }, POLL_MS);
  timer.unref();
  return () => {
    clearInterval(timer);
    for (const w of watchers) w.close();
  };
};
