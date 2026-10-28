// specpulse.config.json: where each input lives in the target project. Every field has a default,
// so a project that follows the default layout needs no config file at all.

export const LOCALES = ["en", "pt-BR", "es"] as const;
export type Locale = (typeof LOCALES)[number];

/** Config file names looked up in the project root, in order, when --config is not given. */
export const CONFIG_FILES = ["specpulse.config.json", ".specpulse.json"] as const;

export interface GalleryConfig {
  /** Folder with the reference images (and the scene files, when `sceneExt` is set). */
  readonly dir: string;
  /** Extension of the reference images. */
  readonly referenceExt: string;
  /** When set, each `<name><sceneExt>` file is a scene; otherwise each reference image is one. */
  readonly sceneExt?: string;
  /**
   * Shell command that renders one scene to a PNG. Placeholders: `{scene}` (path relative to the
   * project root), `{out}` (absolute output path), `{name}` (scene name). Omit to skip rendering.
   */
  readonly render?: string;
}

export const SPEC_FORMATS = ["markdown", "frontmatter", "auto", "folder"] as const;
export type SpecFormat = (typeof SPEC_FORMATS)[number];

export const ID_SOURCES = ["heading", "filename", "frontmatter"] as const;
export type IdSource = (typeof ID_SOURCES)[number];

export interface SpecsConfig {
  /** Folder with one markdown file per spec (or, with format "folder", one subfolder per spec). */
  readonly dir: string;
  /** Regex (no slashes) for spec IDs, used for headings, file names and commit messages. */
  readonly idPattern: string;
  /**
   * How spec files are read; "auto" tries frontmatter first, then plain markdown; "folder" reads one
   * subfolder per spec (spec-kit, Kiro, OpenSpec).
   */
  readonly format: SpecFormat;
  /** When set, only checkboxes under this heading count as acceptance criteria. */
  readonly acceptanceHeading?: string;
  /** Where the spec ID comes from; when unset, each format uses its natural source. */
  readonly idFrom?: IdSource;
}

export interface LiveConfig {
  /** Shell command run by the Live view ("run check"), e.g. "pnpm -s check". */
  readonly check?: string;
  /** Also run `check` after changes (long debounce, never in parallel). */
  readonly checkOnChange: boolean;
  /** Opt-in: read local Claude Code transcripts of this project (metadata only). */
  readonly claudeSessions: boolean;
  /** How many commits the Live feed shows. */
  readonly commits: number;
}

export interface Config {
  readonly title: string;
  readonly locale: Locale;
  /** Output folder for index.html, copied images and render history. */
  readonly outDir: string;
  readonly dataFile: string;
  readonly roadmap: string;
  /** Phase file path; `{n}` is replaced by the phase number. */
  readonly phaseFile: string;
  readonly specs: SpecsConfig;
  /** Gallery and timeline are only shown when this is set. */
  readonly gallery?: GalleryConfig;
  /** How many render snapshots the timeline shows. */
  readonly timelineLimit: number;
  /** Options of the Live view (only used by --serve). */
  readonly live: LiveConfig;
}

export const defaultConfig = (title: string): Config => ({
  title,
  locale: "en",
  outDir: ".cache/specpulse",
  dataFile: "docs/progress.json",
  roadmap: "docs/roadmap.md",
  phaseFile: "docs/phase-{n}/README.md",
  specs: { dir: "docs/specs", idPattern: "[A-Z]+-\\d{3,}", format: "markdown" },
  timelineLimit: 30,
  live: { checkOnChange: false, claudeSessions: false, commits: 30 },
});

export const phasePath = (config: Config, n: number): string => config.phaseFile.replaceAll("{n}", String(n));

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

const TOP_KEYS = [
  "$schema",
  "$comment",
  "title",
  "locale",
  "outDir",
  "dataFile",
  "roadmap",
  "phaseFile",
  "specs",
  "gallery",
  "timelineLimit",
  "live",
];

const noUnknownKeys = (v: Obj, allowed: readonly string[], where: string): void => {
  const extra = Object.keys(v).find((k) => !allowed.includes(k));
  if (extra) throw new Error(`${where}: unknown key "${extra}" (allowed: ${allowed.join(", ")})`);
};

const text = (v: Obj, key: string, fallback: string, where: string): string => {
  const x = v[key];
  if (x === undefined) return fallback;
  if (typeof x !== "string" || x === "") throw new Error(`${where}: "${key}" must be a non-empty string`);
  return x;
};

const optText = (v: Obj, key: string, where: string): Record<string, string> =>
  v[key] === undefined ? {} : { [key]: text(v, key, "", where) };

const pattern = (p: string, where: string): string => {
  try {
    new RegExp(p);
  } catch {
    throw new Error(`${where}: "specs.idPattern" is not a valid regular expression: ${p}`);
  }
  return p;
};

const oneOf = <T extends string>(
  v: Obj,
  key: string,
  allowed: readonly T[],
  where: string,
): T | undefined => {
  const x = v[key];
  if (x === undefined) return undefined;
  if (!allowed.includes(x as T)) throw new Error(`${where}: "${key}" must be one of: ${allowed.join(", ")}`);
  return x as T;
};

const flag = (v: Obj, key: string, fallback: boolean, where: string): boolean => {
  const x = v[key] ?? fallback;
  if (typeof x !== "boolean") throw new Error(`${where}: "${key}" must be true or false`);
  return x;
};

const positive = (v: Obj, key: string, fallback: number, where: string): number => {
  const n = v[key] ?? fallback;
  if (!Number.isInteger(n) || (n as number) < 1)
    throw new Error(`${where}: "${key}" must be a positive integer`);
  return n as number;
};

const specsOf = (v: unknown, d: SpecsConfig, where: string): SpecsConfig => {
  if (v === undefined) return d;
  if (!isObj(v)) throw new Error(`${where}: "specs" must be an object`);
  const w = `${where} specs`;
  noUnknownKeys(v, ["dir", "idPattern", "format", "acceptanceHeading", "idFrom"], w);
  const idFrom = oneOf(v, "idFrom", ID_SOURCES, w);
  return {
    dir: text(v, "dir", d.dir, w),
    idPattern: pattern(text(v, "idPattern", d.idPattern, w), where),
    format: oneOf(v, "format", SPEC_FORMATS, w) ?? d.format,
    ...optText(v, "acceptanceHeading", w),
    ...(idFrom ? { idFrom } : {}),
  };
};

const liveOf = (v: unknown, d: LiveConfig, where: string): LiveConfig => {
  if (v === undefined) return d;
  if (!isObj(v)) throw new Error(`${where}: "live" must be an object`);
  const w = `${where} live`;
  noUnknownKeys(v, ["check", "checkOnChange", "claudeSessions", "commits"], w);
  return {
    ...optText(v, "check", w),
    checkOnChange: flag(v, "checkOnChange", d.checkOnChange, w),
    claudeSessions: flag(v, "claudeSessions", d.claudeSessions, w),
    commits: positive(v, "commits", d.commits, w),
  };
};

const galleryOf = (v: unknown, where: string): GalleryConfig | undefined => {
  if (v === undefined) return undefined;
  if (!isObj(v)) throw new Error(`${where}: "gallery" must be an object`);
  const w = `${where} gallery`;
  noUnknownKeys(v, ["dir", "referenceExt", "sceneExt", "render"], w);
  if (v["dir"] === undefined) throw new Error(`${w}: "dir" is required`);
  return {
    dir: text(v, "dir", "", w),
    referenceExt: text(v, "referenceExt", ".png", w),
    ...optText(v, "sceneExt", w),
    ...optText(v, "render", w),
  };
};

const localeOf = (v: Obj, d: Locale, where: string): Locale => {
  const l = v["locale"] ?? d;
  if (!LOCALES.includes(l as Locale))
    throw new Error(`${where}: "locale" must be one of: ${LOCALES.join(", ")}`);
  return l as Locale;
};

/**
 * Validates a parsed config object and fills in defaults. `where` (usually the config path)
 * prefixes every error message.
 */
export const parseConfig = (raw: unknown, title: string, where: string): Config => {
  if (!isObj(raw)) throw new Error(`${where}: must be a JSON object`);
  noUnknownKeys(raw, TOP_KEYS, where);
  const d = defaultConfig(title);
  const gallery = galleryOf(raw["gallery"], where);
  return {
    title: text(raw, "title", d.title, where),
    locale: localeOf(raw, d.locale, where),
    outDir: text(raw, "outDir", d.outDir, where),
    dataFile: text(raw, "dataFile", d.dataFile, where),
    roadmap: text(raw, "roadmap", d.roadmap, where),
    phaseFile: text(raw, "phaseFile", d.phaseFile, where),
    specs: specsOf(raw["specs"], d.specs, where),
    ...(gallery ? { gallery } : {}),
    timelineLimit: positive(raw, "timelineLimit", d.timelineLimit, where),
    live: liveOf(raw["live"], d.live, where),
  };
};
