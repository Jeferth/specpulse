// Gathers the Live view state from git, the file system and (opt-in) Claude Code transcripts.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { projectDirName, sessionFromJsonl } from "../claude-sessions.ts";
import { GIT_LOG_FORMAT, parseGitLog } from "../git-log.ts";
import {
  type CheckState,
  groupChanged,
  type LiveState,
  parseNameLog,
  parsePorcelain,
  type RecentFile,
  recentFiles,
  type SessionView,
} from "../live.ts";
import { git } from "./repo.ts";

export const RECENT_WINDOW_MS = 10 * 60_000;
const MAX_SESSIONS = 5;

const cache = new Map<string, { mtime: number; session: SessionView | undefined }>();

/**
 * Reads the newest transcripts of this project from `<home>/.claude/projects/<dir>/`, read-only.
 * Only called when the owner opted in.
 */
export const readSessions = (root: string, home: string): SessionView[] => {
  const dir = join(home, ".claude", "projects", projectDirName(root));
  if (!existsSync(dir)) return [];
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".jsonl"))
    .map((f) => ({ f, mtime: statSync(join(dir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, MAX_SESSIONS);
  return files
    .map(({ f, mtime }) => {
      const path = join(dir, f);
      const hit = cache.get(path);
      if (hit && hit.mtime === mtime) return hit.session;
      const session = sessionFromJsonl(f.slice(0, -".jsonl".length), readFileSync(path, "utf8"), root);
      cache.set(path, { mtime, session });
      return session;
    })
    .filter((s) => s !== undefined);
};

export interface LiveSources {
  readonly root: string;
  readonly idPattern: string;
  readonly commits: number;
  readonly claudeSessions: boolean;
  readonly home: string;
  readonly now: number;
  /** Injectable for tests; must never be called without the opt-in. */
  readonly sessions?: (root: string, home: string) => SessionView[];
}

const touchedFiles = (root: string, paths: readonly string[]): RecentFile[] =>
  paths.flatMap((p) => {
    const st = statSync(join(root, p), { throwIfNoEntry: false });
    return st?.isFile() ? [{ path: p, at: new Date(st.mtimeMs).toISOString() }] : [];
  });

export const collectLive = (s: LiveSources, check: CheckState): LiveState => {
  const changed = parsePorcelain(git(s.root, ["--no-optional-locks", "status", "--porcelain=v1"]) ?? "");
  const committed = parseNameLog(
    git(s.root, ["log", "--since=10 minutes ago", "--name-only", "--format=%x1e%cI"]) ?? "",
  );
  const commits = parseGitLog(
    git(s.root, ["log", `-n${s.commits}`, `--format=${GIT_LOG_FORMAT}`]) ?? "",
    s.idPattern,
  );
  const recent = recentFiles(
    [
      ...touchedFiles(
        s.root,
        changed.map((c) => c.path),
      ),
      ...committed,
    ],
    s.now,
    RECENT_WINDOW_MS,
  );
  const read = s.sessions ?? readSessions;
  return {
    commits,
    changed: groupChanged(changed),
    recent,
    check,
    ...(s.claudeSessions ? { sessions: read(s.root, s.home) } : {}),
  };
};
