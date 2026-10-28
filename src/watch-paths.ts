// What the live server watches for a given config. Pure, so the choice is testable: inputs only,
// never the whole project (node_modules would make recursive watching expensive), and git through
// HEAD and refs only (the index changes on every `git status`, which would loop forever).
import type { Config } from "./config.ts";

export interface WatchEntry {
  readonly path: string;
  readonly kind: "file" | "dir";
}

/** Folder holding every phase file: the part of `phaseFile` before `{n}`, up to its last slash. */
export const phaseDir = (phaseFile: string): string => {
  const head = phaseFile.split("{n}")[0] ?? "";
  return head.includes("/") ? head.slice(0, head.lastIndexOf("/")) || "." : ".";
};

const clean = (p: string): string => p.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+$/, "") || ".";

/**
 * Folders (recursive) and single files to watch. `phases` are the phase numbers known at start;
 * their files are listed explicitly when they live outside the watched folders (e.g. in the root).
 */
export const watchedPaths = (c: Config, phases: readonly number[] = []): WatchEntry[] => {
  const dirs = [
    ...new Set(
      [phaseDir(c.phaseFile), c.specs.dir, ...(c.gallery ? [c.gallery.dir] : []), ".git/refs"]
        .map(clean)
        .filter((d) => d !== "."),
    ),
  ];
  const phaseFiles = phases.map((n) => c.phaseFile.replaceAll("{n}", String(n)));
  const files = [
    ...new Set([c.roadmap, c.dataFile, ...phaseFiles, ".git/HEAD", ".git/packed-refs"].map(clean)),
  ];
  return [
    ...dirs.map((path) => ({ path, kind: "dir" as const })),
    ...files
      .filter((f) => !dirs.some((d) => f.startsWith(`${d}/`)))
      .map((path) => ({ path, kind: "file" as const })),
  ];
};

/** Changed paths that matter for the model; the output folder (written by us) never does. */
export const isRelevant = (rel: string, outDir: string): boolean => {
  const out = clean(outDir);
  if (rel === out || rel.startsWith(`${out}/`)) return false;
  return !/(^|\/)\.git\/(index|.*\.lock)$/.test(rel) && !rel.endsWith("~");
};
