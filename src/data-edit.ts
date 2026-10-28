// Edits the data file on behalf of an agent (MCP `progress_update`). The rewrite keeps everything the
// owner wrote: key order, `$comment`, unknown keys and the file's language (Portuguese files keep
// marcos/goldens/fonte/nota/aprovada and Portuguese status words). It also enforces the rules a
// careless edit would break: a manual status needs a source, a milestone made of specs gets no manual
// status, and approving an image is left to the owner.
import { parseDataFile, STATUS_ALIASES, type Status } from "./data-file.ts";

export interface MilestoneChange {
  readonly milestone: string;
  /** Manual status, in any accepted spelling; `null` removes the manual status (and its source). */
  readonly status?: string | null;
  /** Where the manual status comes from; required whenever `status` is set. */
  readonly source?: string | null;
  /** Spec IDs that make up the milestone; `[]` removes the list. */
  readonly specs?: readonly string[];
  /** Free note; `null` or `""` removes it. */
  readonly note?: string | null;
}

export interface ImageChange {
  readonly image: string;
  /** Only `false` is accepted: approving is the owner's call. */
  readonly approved: boolean;
  readonly note?: string | null;
}

export type DataChange = MilestoneChange | ImageChange;

type Obj = Record<string, unknown>;
type Lang = "en" | "pt";

const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

const KEYS = {
  en: { milestones: "milestones", images: "images", source: "source", note: "note", approved: "approved" },
  pt: { milestones: "marcos", images: "goldens", source: "fonte", note: "nota", approved: "aprovada" },
} as const;
type KeyName = keyof (typeof KEYS)["en"];

const STATUS_WORDS: Readonly<Record<Lang, Readonly<Record<Status, string>>>> = {
  en: { done: "done", doing: "doing", todo: "todo" },
  pt: { done: "feito", doing: "em andamento", todo: "a fazer" },
};

const langOf = (raw: Obj): Lang => {
  const has = (k: string) => raw[k] !== undefined;
  return (has("marcos") || has("goldens")) && !has("milestones") && !has("images") ? "pt" : "en";
};

/** The spelling already used in `obj`, else the file's language. */
const keyIn = (obj: Obj, name: KeyName, lang: Lang): string => {
  if (obj[KEYS.en[name]] !== undefined) return KEYS.en[name];
  if (obj[KEYS.pt[name]] !== undefined) return KEYS.pt[name];
  return KEYS[lang][name];
};

/** Assigning keeps an existing key in place; `undefined` deletes it. */
const put = (obj: Obj, key: string, value: unknown): void => {
  if (value === undefined) delete obj[key];
  else obj[key] = value;
};

const sectionOf = (raw: Obj, name: "milestones" | "images", lang: Lang): Obj => {
  const key = keyIn(raw, name, lang);
  const existing = raw[key];
  if (isObj(existing)) return existing;
  const created: Obj = {};
  raw[key] = created;
  return created;
};

const entryOf = (section: Obj, id: string): Obj => {
  const existing = section[id];
  const entry: Obj = isObj(existing) ? existing : {};
  section[id] = entry;
  return entry;
};

const statusFrom = (id: string, raw: string): Status => {
  const s = STATUS_ALIASES[raw.trim().toLowerCase()];
  if (!s)
    throw new Error(
      `milestone ${id}: status "${raw}" is not valid; use one of: ${Object.keys(STATUS_ALIASES).join(", ")}`,
    );
  return s;
};

const applyStatus = (entry: Obj, c: MilestoneChange, lang: Lang): void => {
  const sourceKey = keyIn(entry, "source", lang);
  if (c.status === null) {
    delete entry["status"];
    if (c.source === undefined) delete entry[sourceKey];
  } else if (c.status !== undefined) {
    const status = statusFrom(c.milestone, c.status);
    if (typeof c.source !== "string" || c.source.trim() === "")
      throw new Error(
        `milestone ${c.milestone}: a manual status needs \`source\` saying where it comes from ` +
          `(e.g. "README: demo recorded" or a commit hash). A status without a source looks guessed; ` +
          `if progress comes from specs, set \`specs\` instead of \`status\`.`,
      );
    entry["status"] = STATUS_WORDS[lang][status];
  }
  if (c.source !== undefined) put(entry, sourceKey, c.source || undefined);
};

const applyMilestone = (raw: Obj, c: MilestoneChange, lang: Lang): void => {
  if (c.status === undefined && c.source === undefined && c.specs === undefined && c.note === undefined)
    throw new Error(`milestone ${c.milestone}: nothing to change (pass status+source, specs or note)`);
  const entry = entryOf(sectionOf(raw, "milestones", lang), c.milestone);
  applyStatus(entry, c, lang);
  if (c.specs !== undefined) put(entry, "specs", c.specs.length ? [...c.specs] : undefined);
  if (c.note !== undefined) put(entry, keyIn(entry, "note", lang), c.note || undefined);
  const specs = entry["specs"];
  if (entry["status"] !== undefined && Array.isArray(specs) && specs.length > 0)
    throw new Error(
      `milestone ${c.milestone} is made of specs (${specs.join(", ")}), so its status is derived from ` +
        `their acceptance checkboxes. Do not set a manual status: tick the criteria in the spec files ` +
        `instead. Only if the milestone is really tracked by hand, pass specs: [] together with the status.`,
    );
};

const applyImage = (raw: Obj, c: ImageChange, lang: Lang): void => {
  if (c.approved !== false)
    throw new Error(
      `image "${c.image}": approving an image is the project owner's decision, so specpulse never sets ` +
        `approved: true. Ask the owner to review it and edit the data file themselves. ` +
        `You may set approved: false (for example to flag a regression).`,
    );
  const entry = entryOf(sectionOf(raw, "images", lang), c.image);
  entry[keyIn(entry, "approved", lang)] = false;
  if (c.note !== undefined) put(entry, keyIn(entry, "note", lang), c.note || undefined);
};

const parseRaw = (json: string | undefined, label: string): Obj => {
  if (json === undefined || json.trim() === "") return { milestones: {}, images: {} };
  // Refuse to rewrite a file that is already invalid: the owner should see the original error.
  parseDataFile(json, label);
  return JSON.parse(json) as Obj;
};

/**
 * Applies `change` to the data file text (undefined = the file does not exist yet, created with
 * English keys) and returns the new text: 2-space JSON with a trailing newline, keeping the original
 * line endings. Throws an explanatory error when the change breaks a rule or the result is invalid.
 */
export const updateDataFile = (json: string | undefined, change: DataChange, label: string): string => {
  const raw = parseRaw(json, label);
  const lang = langOf(raw);
  if ("image" in change) {
    if (!change.image) throw new Error("`image` must be a non-empty scene name");
    applyImage(raw, change, lang);
  } else {
    if (!change.milestone) throw new Error("`milestone` must be a non-empty milestone ID (e.g. 1.2)");
    applyMilestone(raw, change, lang);
  }
  const text = `${JSON.stringify(raw, null, 2)}\n`;
  parseDataFile(text, label);
  return json?.includes("\r\n") ? text.replaceAll("\n", "\r\n") : text;
};
