// Live view state (only exists while `specpulse --serve` runs) and the pure helpers that build it
// from git output. Nothing here is ever written into the static index.html.

export interface LiveCommit {
  readonly hash: string;
  readonly date: string;
  readonly subject: string;
  readonly specs: readonly string[];
}

export interface ChangedFile {
  /** Two-letter `git status --porcelain` code, e.g. " M", "??", "A ". */
  readonly code: string;
  readonly path: string;
}

export interface ChangedGroup {
  /** Folder of the files ("." for the project root). */
  readonly dir: string;
  readonly files: readonly ChangedFile[];
}

export interface RecentFile {
  readonly path: string;
  /** ISO time of the last change. */
  readonly at: string;
}

export type CheckStatus = "none" | "idle" | "running" | "passed" | "failed";

export interface CheckState {
  readonly status: CheckStatus;
  readonly command?: string;
  readonly code?: number;
  readonly seconds?: number;
  readonly at?: string;
  /** Last lines of the combined output. */
  readonly output?: readonly string[];
}

export interface SessionTool {
  readonly name: string;
  /** Path relative to the project; absent when the tool had no file or it was outside the project. */
  readonly file?: string;
  readonly at: string;
}

export interface SessionView {
  readonly id: string;
  readonly start: string;
  readonly last: string;
  /** Most recent first. */
  readonly tools: readonly SessionTool[];
  readonly commits: readonly string[];
}

export interface LiveState {
  readonly commits: readonly LiveCommit[];
  readonly changed: readonly ChangedGroup[];
  readonly recent: readonly RecentFile[];
  readonly check: CheckState;
  /** undefined = Claude Code sessions are off (opt-in). */
  readonly sessions?: readonly SessionView[];
}

/** What changed between two rebuilds, sent with each `model` event. */
export interface Activity {
  readonly files: readonly string[];
  readonly newCommits: readonly string[];
}

const unquote = (p: string): string => (p.startsWith('"') && p.endsWith('"') ? p.slice(1, -1) : p);

/** Parses `git status --porcelain` (v1). Renames keep the new path. */
export const parsePorcelain = (text: string): ChangedFile[] =>
  text
    .split(/\r?\n/)
    .filter((l) => l.length > 3)
    .map((l) => {
      const rest = l.slice(3);
      const arrow = rest.indexOf(" -> ");
      return { code: l.slice(0, 2), path: unquote(arrow >= 0 ? rest.slice(arrow + 4) : rest) };
    });

const dirOf = (path: string): string => {
  const trimmed = path.endsWith("/") ? path.slice(0, -1) : path;
  const i = trimmed.lastIndexOf("/");
  return i < 0 ? "." : trimmed.slice(0, i);
};

/** Groups changed files by folder, folders and files sorted. */
export const groupChanged = (files: readonly ChangedFile[]): ChangedGroup[] => {
  const groups = new Map<string, ChangedFile[]>();
  for (const f of files) {
    const dir = dirOf(f.path);
    groups.set(dir, [...(groups.get(dir) ?? []), f]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dir, list]) => ({ dir, files: [...list].sort((a, b) => a.path.localeCompare(b.path)) }));
};

/** Files changed within `windowMs` of `now`, newest first; the newest time wins for repeats. */
export const recentFiles = (touched: readonly RecentFile[], now: number, windowMs: number): RecentFile[] => {
  const latest = new Map<string, string>();
  for (const f of touched) {
    const t = Date.parse(f.at);
    if (Number.isNaN(t) || now - t > windowMs) continue;
    const prev = latest.get(f.path);
    if (!prev || Date.parse(prev) < t) latest.set(f.path, f.at);
  }
  return [...latest.entries()]
    .map(([path, at]) => ({ path, at }))
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at) || a.path.localeCompare(b.path));
};

/** Commits present in `next` but not in `prev` (both newest first). */
export const newCommits = (
  prev: readonly { hash: string }[],
  next: readonly { hash: string }[],
): string[] => {
  const known = new Set(prev.map((c) => c.hash));
  return next.filter((c) => !known.has(c.hash)).map((c) => c.hash);
};

/** Keeps the last `n` non-empty lines of a command's output. */
export const tailLines = (text: string, n: number): string[] =>
  text
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l !== "")
    .slice(-n);

/** Files of `git log --name-only --format=%x1e%cI`, each stamped with its commit time. */
export const parseNameLog = (text: string): RecentFile[] =>
  text.split("\x1e").flatMap((rec) => {
    const [at = "", ...files] = rec
      .trim()
      .split(/\r?\n/)
      .map((l) => l.trim());
    return at ? files.filter((f) => f !== "").map((path) => ({ path, at })) : [];
  });

/** What a rebuild tells the open pages: the changed paths and the commits that just appeared. */
export const activityOf = (
  files: readonly string[],
  prev: readonly { hash: string }[],
  next: readonly { hash: string }[],
): Activity => ({ files: [...files], newCommits: prev.length ? newCommits(prev, next) : [] });
