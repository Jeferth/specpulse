// Minimal frontmatter reader: a `---` block at the very top of a markdown file holding `key: value`
// pairs. Only what spec files need is supported (scalars, quoted strings and flat lists), because a
// full YAML parser would be a runtime dependency; anything else is reported, never thrown.

export type FrontmatterValue = string | readonly string[];

export interface Frontmatter {
  readonly data: Readonly<Record<string, FrontmatterValue>>;
  /** The markdown after the closing `---`. */
  readonly body: string;
  /** Lines that could not be read, as `line N: reason` (1-based, counting the opening `---`). */
  readonly errors: readonly string[];
}

const FENCE = /^---\s*$/;
const KEY = /^([A-Za-z_][\w.-]*)\s*:(?:\s+(.*))?$/;
const ITEM = /^\s+-\s+(.*)$|^-\s+(.*)$/;

const unquote = (raw: string): string => {
  const s = raw.trim();
  if (s.length >= 2 && s.startsWith("'") && s.endsWith("'")) return s.slice(1, -1).replaceAll("''", "'");
  if (s.length >= 2 && s.startsWith('"') && s.endsWith('"'))
    return s.slice(1, -1).replace(/\\(["\\nt])/g, (_, c: string) => ({ n: "\n", t: "\t" })[c] ?? c);
  // A plain scalar may carry a trailing comment; quoted ones keep their `#`.
  return s.replace(/\s+#.*$/, "");
};

/** Splits `[a, "b, c", d]` on commas that are outside quotes. */
const inlineList = (raw: string): string[] => {
  const inner = raw.trim().slice(1, -1);
  const parts: string[] = [];
  let quote = "";
  let cur = "";
  for (const ch of inner) {
    if (quote) quote = ch === quote ? "" : quote;
    else if (ch === "'" || ch === '"') quote = ch;
    else if (ch === ",") {
      parts.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  parts.push(cur);
  return parts.map(unquote).filter((p) => p !== "");
};

const scalarOrList = (raw: string): FrontmatterValue =>
  /^\[.*\]$/.test(raw.trim()) ? inlineList(raw) : unquote(raw);

interface State {
  readonly data: Record<string, FrontmatterValue>;
  readonly errors: string[];
  /** Key whose value is an empty scalar so far and may turn into a `- item` list. */
  open?: string | undefined;
}

const readLine = (line: string, n: number, st: State): void => {
  if (line.trim() === "" || line.trimStart().startsWith("#")) return;
  const item = ITEM.exec(line);
  if (item && st.open !== undefined) {
    const prev = st.data[st.open];
    st.data[st.open] = [...(Array.isArray(prev) ? prev : []), unquote(item[1] ?? item[2] ?? "")];
    return;
  }
  const kv = KEY.exec(line);
  if (!kv?.[1]) {
    st.errors.push(`line ${n}: expected "key: value"`);
    st.open = undefined;
    return;
  }
  const raw = kv[2]?.trim() ?? "";
  st.data[kv[1]] = raw === "" ? "" : scalarOrList(raw);
  st.open = raw === "" ? kv[1] : undefined;
};

/**
 * Reads the frontmatter block at the top of `md`. Undefined when the file does not start with
 * `---` or the block is never closed, so the caller can treat the file as plain markdown.
 */
export const parseFrontmatter = (md: string): Frontmatter | undefined => {
  const lines = md.replace(/^\uFEFF/, "").split(/\r?\n/);
  if (!FENCE.test(lines[0] ?? "")) return undefined;
  const end = lines.findIndex((l, i) => i > 0 && FENCE.test(l));
  if (end < 0) return undefined;
  const st: State = { data: {}, errors: [] };
  for (const [i, l] of lines.slice(1, end).entries()) readLine(l, i + 2, st);
  return { data: st.data, body: lines.slice(end + 1).join("\n"), errors: st.errors };
};

/** True when `md` opens with a closed frontmatter block. */
export const hasFrontmatter = (md: string): boolean => parseFrontmatter(md) !== undefined;
