// The data file holds what cannot be derived from the repo: manual milestone status, which specs
// make up a milestone and whether each gallery image was approved. Keys and status values are
// accepted in English or Portuguese, so existing Portuguese files keep working unchanged.

export const STATUSES = ["done", "doing", "todo"] as const;
export type Status = (typeof STATUSES)[number];

/** Accepted spellings of each status in the data file. */
export const STATUS_ALIASES: Readonly<Record<string, Status>> = {
  done: "done",
  "in progress": "doing",
  doing: "doing",
  todo: "todo",
  feito: "done",
  "em andamento": "doing",
  "a fazer": "todo",
};

export interface MilestoneEntry {
  readonly status?: Status;
  /** Where the manual status came from (shown in the dashboard). */
  readonly source?: string;
  readonly specs?: readonly string[];
  readonly note?: string;
}

export interface ImageEntry {
  readonly approved: boolean;
  readonly note?: string;
}

export interface DataFile {
  readonly milestones: Readonly<Record<string, MilestoneEntry>>;
  readonly images: Readonly<Record<string, ImageEntry>>;
}

export const EMPTY_DATA: DataFile = { milestones: {}, images: {} };

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

/** First present key among the English and Portuguese spellings. */
const field = (v: Obj, ...keys: string[]): unknown => v[keys.find((k) => v[k] !== undefined) ?? ""];

const optText = (v: Obj, out: string, ...keys: string[]): Record<string, string> => {
  const s = field(v, ...keys);
  return typeof s === "string" ? { [out]: s } : {};
};

const statusOf = (raw: unknown, where: string): Status | undefined => {
  if (raw === undefined) return undefined;
  const s = typeof raw === "string" ? STATUS_ALIASES[raw] : undefined;
  if (!s) throw new Error(`${where}.status must be one of: ${Object.keys(STATUS_ALIASES).join(", ")}`);
  return s;
};

const milestone = (where: string, v: unknown): MilestoneEntry => {
  if (!isObj(v)) throw new Error(`${where} must be an object`);
  const status = statusOf(v["status"], where);
  const specs = v["specs"];
  if (specs !== undefined && !(Array.isArray(specs) && specs.every((s) => typeof s === "string")))
    throw new Error(`${where}.specs must be a list of spec IDs`);
  return {
    ...(status ? { status } : {}),
    ...(specs === undefined ? {} : { specs: specs as string[] }),
    ...optText(v, "source", "source", "fonte"),
    ...optText(v, "note", "note", "nota"),
  };
};

const image = (where: string, v: unknown): ImageEntry => {
  const approved = isObj(v) ? field(v, "approved", "aprovada") : undefined;
  if (!isObj(v) || typeof approved !== "boolean") throw new Error(`${where}.approved must be true or false`);
  return { approved, ...optText(v, "note", "note", "nota") };
};

const mapEntries = <T>(v: unknown, where: string, f: (where: string, x: unknown) => T): Record<string, T> => {
  if (v !== undefined && !isObj(v)) throw new Error(`${where} must be an object`);
  return Object.fromEntries(Object.entries(v ?? {}).map(([k, x]) => [k, f(`${where}.${k}`, x)]));
};

/**
 * Validates the data file. `label` (usually its path) prefixes every error, so a bad field reads
 * like `docs/progress.json: milestones.1.1.status must be one of: …`.
 */
export const parseDataFile = (json: string, label: string): DataFile => {
  const raw: unknown = JSON.parse(json);
  if (!isObj(raw)) throw new Error(`${label}: must be a JSON object`);
  const ms = raw["milestones"] === undefined ? "marcos" : "milestones";
  const img = raw["images"] === undefined ? "goldens" : "images";
  try {
    return {
      milestones: mapEntries(raw[ms], ms, milestone),
      images: mapEntries(raw[img], img, image),
    };
  } catch (e) {
    throw new Error(`${label}: ${(e as Error).message}`);
  }
};
