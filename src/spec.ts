import type { SpecsConfig } from "./config.ts";
import type { Status } from "./data-file.ts";

export interface Criterion {
  /** The checkbox line without the `- [ ]` prefix, trimmed. */
  readonly text: string;
  readonly done: boolean;
  /** The `##` heading the checkbox sits under (folder specs only, e.g. a spec-kit phase). */
  readonly group?: string;
}

export interface Spec {
  readonly id: string;
  readonly title: string;
  readonly file: string;
  readonly done: number;
  readonly total: number;
  /** The counted checkboxes, in file order (empty for a spec whose progress comes from `status`). */
  readonly criteria: readonly Criterion[];
  /** Status declared by the spec itself (frontmatter). */
  readonly status?: Status;
  /** Milestone declared by the spec itself (frontmatter), on top of the data file's lists. */
  readonly milestone?: string;
  /**
   * "status" when the spec has no checkboxes and `done/total` were synthesised from `status`
   * (done 2/2, doing 1/2, todo 0/2), so every `done/total` consumer keeps working; the UI may print
   * the status instead of a criteria count.
   */
  readonly progressFrom?: "status";
}

/** Reads one spec file; undefined when the file is not a spec. Pure, so new formats are cheap. */
export type SpecAdapter = (md: string, file: string, specs: SpecsConfig) => Spec | undefined;

export const CHECKBOX = /^\s*[-*] \[([ xX])\]\s*(.*)$/;
export const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;

const normalise = (s: string): string => s.trim().replace(/:$/, "").trim().toLowerCase();

/** Lines under the heading named `name`, up to the next heading of the same or a higher level. */
export const section = (lines: readonly string[], name: string): readonly string[] => {
  const want = normalise(name);
  const start = lines.findIndex((l) => normalise(HEADING.exec(l)?.[2] ?? "\0") === want);
  if (start < 0) return [];
  const level = HEADING.exec(lines[start] ?? "")?.[1]?.length ?? 1;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => (HEADING.exec(l)?.[1]?.length ?? 7) <= level);
  return end < 0 ? rest : rest.slice(0, end);
};

/**
 * The checkboxes that count as acceptance criteria: all of them, or only those under
 * `acceptanceHeading` (matched case-insensitively, a trailing `:` ignored; missing heading = none).
 */
export const criteriaOf = (md: string, acceptanceHeading?: string): Criterion[] => {
  const lines = md.split(/\r?\n/);
  const scope = acceptanceHeading === undefined ? lines : section(lines, acceptanceHeading);
  return scope
    .map((l) => CHECKBOX.exec(l))
    .filter((m) => m !== null)
    .map((m) => ({ text: (m[2] ?? "").trim(), done: m[1] !== " " }));
};

const counts = (criteria: readonly Criterion[]) => ({
  done: criteria.filter((c) => c.done).length,
  total: criteria.length,
});

export const baseName = (file: string): string => file.slice(file.lastIndexOf("/") + 1);

/** The ID at the start of the file name, if any. */
export const idFromFileName = (file: string, idPattern: string): string | undefined =>
  new RegExp(`^(?:${idPattern})`).exec(baseName(file))?.[0];

/** `# <ID> · Title` (also `:`, `—` or `-` as separator) → [id, title]. */
const idHeading = (lines: readonly string[], idPattern: string): [string, string] | undefined => {
  const heading = new RegExp(String.raw`^#\s+(${idPattern})\s*[·:—-]\s*(.+)$`);
  const m = lines.map((l) => heading.exec(l)).find((x) => x);
  return m?.[1] && m[2] ? [m[1], m[2].trim()] : undefined;
};

/** Title from the first H1, without a leading `<id> ·`; falls back to the file name. */
export const titleOf = (md: string, file: string, id: string): string => {
  const lines = md.split(/\r?\n/);
  const h1 = lines.map((l) => /^#\s+(.+)$/.exec(l)?.[1]?.trim()).find((t) => t);
  if (h1) {
    const sep = new RegExp(String.raw`^${id.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)}\s*[·:—-]\s*`);
    const rest = h1.replace(sep, "").trim();
    if (rest) return rest;
  }
  const stem = baseName(file).replace(/\.md$/i, "");
  return stem.slice(stem.startsWith(id) ? id.length : 0).replace(/^[\s_.-]+/, "") || stem;
};

export const specOf = (id: string, title: string, file: string, criteria: Criterion[]): Spec => ({
  id,
  title,
  file,
  ...counts(criteria),
  criteria,
});

/**
 * Plain markdown: the ID comes from `# <ID> · Title` (or from the file name with
 * `idFrom: "filename"`); markdown has no frontmatter, so `idFrom: "frontmatter"` finds no ID.
 */
export const markdownAdapter: SpecAdapter = (md, file, specs) => {
  const criteria = criteriaOf(md, specs.acceptanceHeading);
  if (specs.idFrom === "frontmatter") return undefined;
  if (specs.idFrom === "filename") {
    const id = idFromFileName(file, specs.idPattern);
    return id ? specOf(id, titleOf(md, file, id), file, criteria) : undefined;
  }
  const head = idHeading(md.split(/\r?\n/), specs.idPattern);
  return head ? specOf(head[0], head[1], file, criteria) : undefined;
};

/** True when `file` (a bare file name) looks like a spec: starts with an ID and ends in `.md`. */
export const isSpecFile = (file: string, idPattern: string): boolean =>
  new RegExp(`^(?:${idPattern})`).test(file) && file.endsWith(".md");

/**
 * Reads a spec whose first matching heading is `# <ID> · Title` (also `:` or `-` as separator).
 * Every markdown checkbox in the file counts as an acceptance criterion.
 */
export const parseSpec = (md: string, file: string, idPattern: string): Spec | undefined =>
  markdownAdapter(md, file, { dir: "", idPattern, format: "markdown" });
