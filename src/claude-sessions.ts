// Metadata of local Claude Code sessions, read from their JSONL transcripts. Privacy is the point
// of this module: only tool names, file paths inside the project, times and commit subjects ever
// leave it. Prompt text, replies, tool inputs and tool results are never copied.
import type { SessionTool, SessionView } from "./live.ts";

/** Claude Code keeps a project's transcripts in ~/.claude/projects/<root with every non-alphanumeric as "-">. */
export const projectDirName = (root: string): string => root.replace(/[^a-zA-Z0-9]/g, "-");

const isWindowsPath = (p: string): boolean => /^[a-zA-Z]:[\\/]/.test(p);
const slashes = (p: string): string => p.replace(/\\/g, "/").replace(/\/+$/, "");

/** `file` relative to `root` when it is inside it; undefined otherwise (outside paths stay hidden). */
export const insideProject = (file: string, root: string): string | undefined => {
  const f = slashes(file);
  const r = slashes(root);
  const absolute = f.startsWith("/") || isWindowsPath(f);
  if (!absolute) return f.split("/").includes("..") ? undefined : f.replace(/^\.\//, "");
  const fold = isWindowsPath(r) ? (s: string) => s.toLowerCase() : (s: string) => s;
  if (!fold(f).startsWith(`${fold(r)}/`)) return undefined;
  const rel = f.slice(r.length + 1);
  return rel.split("/").includes("..") ? undefined : rel;
};

const SUBJECT_MAX = 120;

/** Subject of a `git commit` in a shell command (-m "…" or a heredoc), if any. */
export const commitSubject = (command: string): string | undefined => {
  if (!/\bgit\b[^\n]*\bcommit\b/.test(command)) return undefined;
  const heredoc = /<<-?\s*['"]?(\w+)['"]?[^\n]*\n\s*([^\n]+)/.exec(command);
  const dashM = /\s-m\s+(?:"((?:[^"\\]|\\.)*)"|'([^']*)')/.exec(command);
  const m = dashM?.[1] ?? dashM?.[2];
  // -m "$(cat <<'EOF' …)" is the usual way agents pass multi-line messages: read the heredoc then.
  const raw = m !== undefined && !m.startsWith("$(") ? m : heredoc?.[2];
  const first = raw?.split(/\\n|\n/)[0]?.trim();
  return first ? first.slice(0, SUBJECT_MAX) : undefined;
};

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

const toolFile = (input: unknown, root: string): string | undefined => {
  if (!isObj(input)) return undefined;
  const p = input["file_path"] ?? input["notebook_path"] ?? input["path"];
  return typeof p === "string" ? insideProject(p, root) : undefined;
};

interface Acc {
  start?: string;
  last?: string;
  tools: SessionTool[];
  commits: string[];
}

const readToolUses = (content: unknown, at: string, root: string, acc: Acc): void => {
  if (!Array.isArray(content)) return;
  for (const item of content) {
    if (!isObj(item) || item["type"] !== "tool_use" || typeof item["name"] !== "string") continue;
    const file = toolFile(item["input"], root);
    acc.tools.push({ name: item["name"], at, ...(file ? { file } : {}) });
    const cmd = isObj(item["input"]) ? item["input"]["command"] : undefined;
    const subject = typeof cmd === "string" ? commitSubject(cmd) : undefined;
    if (subject && !acc.commits.includes(subject)) acc.commits.push(subject);
  }
};

const readLine = (line: string, root: string, acc: Acc): void => {
  let entry: unknown;
  try {
    entry = JSON.parse(line);
  } catch {
    return;
  }
  if (!isObj(entry) || typeof entry["timestamp"] !== "string") return;
  const at = entry["timestamp"];
  acc.start ??= at;
  if (!acc.last || at > acc.last) acc.last = at;
  const message = entry["message"];
  if (entry["type"] === "assistant" && isObj(message)) readToolUses(message["content"], at, root, acc);
};

/** One session from its transcript; undefined when it has no timestamped entry. */
export const sessionFromJsonl = (
  id: string,
  text: string,
  root: string,
  maxTools = 40,
): SessionView | undefined => {
  const acc: Acc = { tools: [], commits: [] };
  for (const line of text.split(/\r?\n/)) if (line.trim()) readLine(line, root, acc);
  if (!acc.start || !acc.last) return undefined;
  return {
    id,
    start: acc.start,
    last: acc.last,
    tools: acc.tools.slice(-maxTools).reverse(),
    commits: acc.commits.slice(-10).reverse(),
  };
};
