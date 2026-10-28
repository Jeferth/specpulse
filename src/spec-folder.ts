// Specs kept as one folder each, the layout of spec-kit (`specs/001-name/`), Kiro
// (`.kiro/specs/<name>/`) and OpenSpec (`openspec/changes/<id>/`). Pure: the caller lists the
// folder and hands over the files that matter.
import type { SpecsConfig } from "./config.ts";
import { CHECKBOX, type Criterion, HEADING, type Spec, section, specOf } from "./spec.ts";

/** Files that may name the spec, in order of preference (compared in lower case). */
export const TITLE_FILES = ["spec.md", "requirements.md", "proposal.md", "readme.md"] as const;
/** The file whose checkboxes are the criteria; without it, the title file's checkboxes count. */
export const TASKS_FILE = "tasks.md";
/** Every file a folder spec is read from. */
export const FOLDER_FILES: readonly string[] = [TASKS_FILE, ...TITLE_FILES];

export interface FolderFile {
  /** Name as found on disk (case kept, so the path shown in the dashboard is real). */
  readonly name: string;
  readonly text: string;
}

const pick = (files: readonly FolderFile[], name: string): FolderFile | undefined =>
  files.find((f) => f.name.toLowerCase() === name);

// Headings the tools put on top of every file; they say what the file is, not what the spec is.
const GENERIC_TITLES = new Set([
  "requirements document",
  "requirements",
  "tasks",
  "implementation plan",
  "proposal",
  "design",
  "design document",
  "spec",
  "specification",
]);

/** `001-photo-albums` → `Photo albums`; a name with nothing but digits stays as it is. */
export const readableName = (folder: string): string => {
  const words = folder
    .replace(/^\d+[-_.\s]*/, "")
    .replace(/[-_]+/g, " ")
    .trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : folder;
};

/** The spec's name from the first H1: `Feature Specification: X` → `X`; generic headings → none. */
export const folderTitle = (md: string | undefined, folder: string): string => {
  const h1 = md
    ?.split(/\r?\n/)
    .map((l) => /^#\s+(.+?)\s*#*\s*$/.exec(l)?.[1]?.trim())
    .find((t) => t);
  if (!h1) return readableName(folder);
  const named = /^[^:]{1,40}:\s*(.+)$/.exec(h1)?.[1]?.trim() ?? h1;
  return GENERIC_TITLES.has(named.toLowerCase()) ? readableName(folder) : named;
};

/** Checkboxes with the `##` heading above each one (spec-kit phases, OpenSpec task groups). */
export const groupedCriteria = (md: string, acceptanceHeading?: string): Criterion[] => {
  const all = md.split(/\r?\n/);
  const lines = acceptanceHeading === undefined ? all : section(all, acceptanceHeading);
  const out: Criterion[] = [];
  let group: string | undefined;
  for (const line of lines) {
    const h = HEADING.exec(line);
    if (h?.[1] === "##") group = h[2]?.trim() || undefined;
    const m = CHECKBOX.exec(line);
    if (m) out.push({ text: (m[2] ?? "").trim(), done: m[1] !== " ", ...(group ? { group } : {}) });
  }
  return out;
};

/**
 * One folder → one spec, its ID being the folder name. Undefined when the folder holds none of
 * FOLDER_FILES (e.g. OpenSpec's `archive/`).
 */
export const folderSpec = (
  folder: string,
  dir: string,
  files: readonly FolderFile[],
  specs: Pick<SpecsConfig, "acceptanceHeading">,
): Spec | undefined => {
  const titleFile = TITLE_FILES.map((n) => pick(files, n)).find((f) => f);
  const tasks = pick(files, TASKS_FILE) ?? titleFile;
  if (!tasks) return undefined;
  const criteria = groupedCriteria(tasks.text, specs.acceptanceHeading);
  return specOf(folder, folderTitle(titleFile?.text, folder), `${dir}/${folder}/${tasks.name}`, criteria);
};

const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

/**
 * Regex that finds folder spec IDs in commit messages: the exact folder names, as whole words
 * (`001-photo-albums` matches, `1001-photo-albums-v2` does not). Longest first, so a name that
 * is the prefix of another never wins. Matches nothing when there are no specs.
 */
export const folderIdPattern = (ids: readonly string[]): string => {
  if (ids.length === 0) return "(?!)";
  const names = [...new Set(ids)].sort((a, b) => b.length - a.length || a.localeCompare(b));
  return String.raw`(?<![\w-])(?:${names.map(escapeRegex).join("|")})(?![\w-])`;
};
