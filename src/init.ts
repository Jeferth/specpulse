// `specpulse init`, pure part: guess the project layout from a list of file paths and turn the
// guess into the smallest config that reproduces it. Disk access lives in src/commands/init.ts.
import { type Config, defaultConfig, type Locale, type SpecFormat } from "./config.ts";
import { FOLDER_FILES } from "./spec-folder.ts";

/** A snapshot of the project: relative POSIX paths, plus the first bytes of some files. */
export interface FileTree {
  readonly paths: readonly string[];
  /** Start of each file whose content matters (spec files, for the frontmatter check). */
  readonly heads?: Readonly<Record<string, string>>;
}

export interface Detection {
  readonly roadmap?: string;
  readonly phaseFile?: string;
  readonly specsDir?: string;
  /** Spec files found directly in `specsDir` (the dashboard does not recurse). */
  readonly specFiles: readonly string[];
  readonly idPattern?: string;
  readonly specFormat?: SpecFormat;
  readonly dataFile?: string;
  /** Only set when the layout itself is in another language (e.g. `fase-1`, `progresso.json`). */
  readonly locale?: Locale;
}

const ROADMAPS = ["docs/roadmap.md", "roadmap.md", "doc/roadmap.md", ".github/roadmap.md"];

const SPEC_DIRS = [
  "docs/specs/features",
  "docs/specs",
  "specs/features",
  "specs",
  "docs/spec",
  "spec",
  "docs/features",
];

// One folder per spec: spec-kit, Kiro, OpenSpec, and the same idea under docs/.
const FOLDER_SPEC_DIRS = ["specs", ".kiro/specs", "openspec/changes", "docs/specs"];

const DATA_FILES: readonly { readonly name: string; readonly locale?: Locale }[] = [
  { name: "progress.json" },
  { name: "progresso.json", locale: "pt-BR" },
  { name: "progreso.json", locale: "es" },
];

/** Where the data file goes when none exists; the name follows the locale of the dashboard. */
const DATA_FILE_FOR: Readonly<Record<Locale, string>> = {
  en: "docs/progress.json",
  "pt-BR": "docs/progresso.json",
  es: "docs/progreso.json",
};

const PHASE_SEGMENT = /^(phase|fase|etapa|stage)[-_]?\d+(\.md)?$/i;
const PHASE_PARENT = /^(phases|fases|etapas|stages)$/i;
const NUMERIC_SEGMENT = /^\d+(\.md)?$/;
const ID_FILE = /^([A-Z]+)-(\d+)/;
const NOT_SPECS = /^(readme|index|template|_template)\.md$/i;

const basename = (p: string): string => p.slice(p.lastIndexOf("/") + 1);
const dirOf = (p: string): string => (p.includes("/") ? p.slice(0, p.lastIndexOf("/")) : "");
const isMd = (p: string): boolean => p.toLowerCase().endsWith(".md");

const findRoadmap = (paths: readonly string[]): string | undefined => {
  const byLower = new Map(paths.map((p) => [p.toLowerCase(), p]));
  for (const r of ROADMAPS) {
    const hit = byLower.get(r);
    if (hit) return hit;
  }
  return undefined;
};

/** `docs/fase-2/README.md` → template `docs/fase-{n}/README.md` and phase 2. */
const phaseTemplate = (path: string): { template: string; n: number } | undefined => {
  if (!isMd(path)) return undefined;
  const parts = path.split("/");
  const i = parts.findIndex(
    (seg, k) =>
      PHASE_SEGMENT.test(seg) || (NUMERIC_SEGMENT.test(seg) && PHASE_PARENT.test(parts[k - 1] ?? "")),
  );
  const seg = parts[i];
  if (seg === undefined) return undefined;
  const n = Number(/\d+/.exec(seg)?.[0]);
  parts[i] = seg.replace(/\d+/, "{n}");
  return { template: parts.join("/"), n };
};

const readmeRank = (template: string): number => {
  const name = basename(template).toLowerCase();
  if (name === "readme.md") return 0;
  if (name === "index.md") return 1;
  return 2;
};

// The template that covers the most distinct phase numbers wins; within a folder the README is the
// phase file, other notes next to it are not.
const findPhaseFile = (paths: readonly string[]): string | undefined => {
  const phases = new Map<string, Set<number>>();
  for (const p of paths) {
    const t = phaseTemplate(p);
    if (t) phases.set(t.template, (phases.get(t.template) ?? new Set()).add(t.n));
  }
  const ranked = [...phases.entries()].sort(
    ([a, na], [b, nb]) => nb.size - na.size || readmeRank(a) - readmeRank(b) || a.length - b.length,
  );
  return ranked[0]?.[0];
};

const specFilesIn = (paths: readonly string[], dir: string): string[] =>
  paths.filter((p) => dirOf(p) === dir && isMd(p) && !NOT_SPECS.test(basename(p)));

const findSpecsDir = (paths: readonly string[]): string | undefined => {
  const scored = SPEC_DIRS.map((dir) => {
    const files = specFilesIn(paths, dir);
    return { dir, files: files.length, ids: files.filter((f) => ID_FILE.test(basename(f))).length };
  });
  const byIds = scored.filter((s) => s.ids > 0).sort((a, b) => b.ids - a.ids)[0];
  return (byIds ?? scored.find((s) => s.files > 0))?.dir;
};

/** Folders `<dir>/<name>/` that hold a tasks/spec/requirements/proposal file. */
const specFoldersIn = (paths: readonly string[], dir: string): Set<string> => {
  const prefix = `${dir}/`;
  const names = new Set<string>();
  for (const p of paths) {
    if (!p.startsWith(prefix)) continue;
    const [name, file, ...deeper] = p.slice(prefix.length).split("/");
    if (name && file && deeper.length === 0 && FOLDER_FILES.includes(file.toLowerCase())) names.add(name);
  }
  return names;
};

/** The folder-per-spec layout with the most spec folders, if any. */
export const findFolderSpecsDir = (paths: readonly string[]): string | undefined =>
  FOLDER_SPEC_DIRS.map((dir) => ({ dir, n: specFoldersIn(paths, dir).size }))
    .filter((d) => d.n > 0)
    .sort((a, b) => b.n - a.n)[0]?.dir;

/**
 * Regex for the IDs in spec file names: `F-0001` → `F-\d{4}`, `APP-1`/`APP-12` → `APP-\d{1,}`,
 * several prefixes → `[A-Z]+-\d{n,}`. Undefined when no file name starts with an ID.
 */
export const inferIdPattern = (fileNames: readonly string[]): string | undefined => {
  const ids = fileNames.map((f) => ID_FILE.exec(basename(f))).filter((m) => m !== null);
  if (ids.length === 0) return undefined;
  const prefixes = new Set(ids.map((m) => m[1]));
  const lengths = ids.map((m) => (m[2] ?? "").length);
  const min = Math.min(...lengths);
  const digits = lengths.every((l) => l === min) ? `\\d{${min}}` : `\\d{${min},}`;
  const [only] = prefixes;
  return prefixes.size === 1 && only !== undefined ? `${only}-${digits}` : `[A-Z]+-\\d{${min},}`;
};

const startsWithFrontmatter = (text: string): boolean => /^﻿?---\r?\n/.test(text);

/** All spec files with frontmatter → "frontmatter"; only some → "auto"; none (or unknown) → undefined. */
export const inferSpecFormat = (
  files: readonly string[],
  heads: Readonly<Record<string, string>> = {},
): SpecFormat | undefined => {
  const known = files.filter((f) => heads[f] !== undefined);
  const withFm = known.filter((f) => startsWithFrontmatter(heads[f] ?? "")).length;
  if (withFm === 0) return undefined;
  return withFm === known.length ? "frontmatter" : "auto";
};

const findDataFile = (paths: readonly string[]): { path: string; locale?: Locale } | undefined => {
  const set = new Set(paths);
  for (const dir of ["docs/", ""]) {
    const hit = DATA_FILES.find((d) => set.has(dir + d.name));
    if (hit) return { path: dir + hit.name, ...(hit.locale ? { locale: hit.locale } : {}) };
  }
  return undefined;
};

// "fase"/"etapa" are both Portuguese and Spanish; Portuguese is the guess unless the data file
// name says otherwise, and --locale always wins.
const layoutLocale = (phaseFile: string | undefined, dataLocale: Locale | undefined): Locale | undefined =>
  dataLocale ?? (phaseFile && /(^|\/)(fase|etapa)/i.test(phaseFile) ? "pt-BR" : undefined);

export const detectLayout = (tree: FileTree): Detection => {
  const { paths } = tree;
  const roadmap = findRoadmap(paths);
  const phaseFile = findPhaseFile(paths);
  const flatDir = findSpecsDir(paths);
  const flatFiles = flatDir === undefined ? [] : specFilesIn(paths, flatDir);
  const idPattern = inferIdPattern(flatFiles);
  // Flat specs named by ID are an explicit choice; otherwise a folder-per-spec layout wins.
  const folderDir = idPattern ? undefined : findFolderSpecsDir(paths);
  const specsDir = folderDir ?? flatDir;
  const specFiles = folderDir ? [] : flatFiles;
  const specFormat = folderDir ? "folder" : inferSpecFormat(specFiles, tree.heads);
  const data = findDataFile(paths);
  const locale = layoutLocale(phaseFile, data?.locale);
  return {
    specFiles,
    ...(roadmap ? { roadmap } : {}),
    ...(phaseFile ? { phaseFile } : {}),
    ...(specsDir ? { specsDir } : {}),
    ...(idPattern ? { idPattern } : {}),
    ...(specFormat ? { specFormat } : {}),
    ...(data ? { dataFile: data.path } : {}),
    ...(locale ? { locale } : {}),
  };
};

/**
 * The config implied by a detection. An explicit `locale` wins over the one guessed from the
 * layout; a missing data file is placed by locale (see DATA_FILE_FOR).
 */
export const configFromDetection = (d: Detection, title: string, locale?: Locale): Config => {
  const base = defaultConfig(title);
  const lang = locale ?? d.locale ?? base.locale;
  return {
    ...base,
    locale: lang,
    dataFile: d.dataFile ?? DATA_FILE_FOR[lang],
    roadmap: d.roadmap ?? base.roadmap,
    phaseFile: d.phaseFile ?? base.phaseFile,
    specs: {
      ...base.specs,
      dir: d.specsDir ?? base.specs.dir,
      idPattern: d.idPattern ?? base.specs.idPattern,
      format: d.specFormat ?? base.specs.format,
    },
  };
};

type Json = Record<string, unknown>;

const isPlainObject = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);

const diffObject = (value: Json, base: Json): Json => {
  const out: Json = {};
  for (const [k, v] of Object.entries(value)) {
    const b = base[k];
    if (isPlainObject(v) && isPlainObject(b)) {
      const sub = diffObject(v, b);
      if (Object.keys(sub).length > 0) out[k] = sub;
    } else if (JSON.stringify(v) !== JSON.stringify(b)) out[k] = v;
  }
  return out;
};

/**
 * Only the fields of `config` that differ from the defaults. `title` is the one the dashboard
 * would use anyway (package.json name or folder name), so an unchanged title is left out.
 */
export const configDiff = (config: Config, title: string): Json =>
  diffObject(config as unknown as Json, defaultConfig(title) as unknown as Json);

const SCHEMA_DIR = "node_modules/specpulse/schema";

/** `$schema` value for a file at `file` (relative to the root), pointing into node_modules. */
export const schemaRef = (file: string, schema: "config" | "data"): string => {
  const depth = file.split("/").length - 1;
  const up = depth === 0 ? "./" : "../".repeat(depth);
  return `${up}${SCHEMA_DIR}/${schema}.schema.json`;
};

export const configFileText = (config: Config, title: string): string =>
  `${JSON.stringify({ $schema: schemaRef("specpulse.config.json", "config"), ...configDiff(config, title) }, null, 2)}\n`;

export const emptyDataFileText = (dataFile: string): string =>
  `${JSON.stringify({ $schema: schemaRef(dataFile, "data"), milestones: {}, images: {} }, null, 2)}\n`;

const normalizeIgnore = (line: string): string =>
  line
    .trim()
    .replace(/^\*\*\//, "")
    .replace(/^\//, "")
    .replace(/\/(\*\*?)?$/, "");

/**
 * Whether a .gitignore already covers `outDir` (the folder itself or one of its parents). A
 * heuristic over plain path lines: globs and negations are not evaluated, at worst the hint shows.
 */
export const isIgnored = (gitignore: string, outDir: string): boolean => {
  const target = outDir.replace(/^\.\//, "").replace(/\/$/, "");
  return gitignore
    .split(/\r?\n/)
    .filter((l) => l.trim() !== "" && !l.trim().startsWith("#") && !l.trim().startsWith("!"))
    .map(normalizeIgnore)
    .some((l) => l !== "" && (target === l || target.startsWith(`${l}/`)));
};
