// specpulse.config.json: where each input lives in the target project. Every field has a default,
// so a project that follows the default layout needs no config file at all.

export const LOCALES = ["en", "pt-BR"] as const;
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

export interface SpecsConfig {
  /** Folder with one markdown file per spec. */
  readonly dir: string;
  /** Regex (no slashes) for spec IDs, used for headings, file names and commit messages. */
  readonly idPattern: string;
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
}

export const defaultConfig = (title: string): Config => ({
  title,
  locale: "en",
  outDir: ".cache/specpulse",
  dataFile: "docs/progress.json",
  roadmap: "docs/roadmap.md",
  phaseFile: "docs/phase-{n}/README.md",
  specs: { dir: "docs/specs", idPattern: "[A-Z]+-\\d{3,}" },
  timelineLimit: 30,
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

const specsOf = (v: unknown, d: SpecsConfig, where: string): SpecsConfig => {
  if (v === undefined) return d;
  if (!isObj(v)) throw new Error(`${where}: "specs" must be an object`);
  noUnknownKeys(v, ["dir", "idPattern"], `${where} specs`);
  return {
    dir: text(v, "dir", d.dir, `${where} specs`),
    idPattern: pattern(text(v, "idPattern", d.idPattern, `${where} specs`), where),
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

const limitOf = (v: Obj, d: number, where: string): number => {
  const n = v["timelineLimit"] ?? d;
  if (!Number.isInteger(n) || (n as number) < 1)
    throw new Error(`${where}: "timelineLimit" must be a positive integer`);
  return n as number;
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
    timelineLimit: limitOf(raw, d.timelineLimit, where),
  };
};
