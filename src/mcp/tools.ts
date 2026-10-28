// The specpulse MCP tools. Pure over a `Workspace` (the project's I/O, injected), so tests can use a
// fake project and the stdio command wires in the real one.
import { type DataChange, updateDataFile } from "../data-edit.ts";
import type { Model } from "../model.ts";
import { buildSummary, renderSummary, type SummaryFilter } from "../summary.ts";
import type { Tool, ToolOutput } from "./protocol.ts";

export interface Workspace {
  /** Data file path relative to the project root, as shown to the agent. */
  readonly dataFile: string;
  readonly model: () => Model;
  /** Current data file text; undefined when it does not exist. */
  readonly readData: () => string | undefined;
  readonly writeData: (text: string) => void;
  /** Writes the dashboard (no render command) and returns the index.html path. */
  readonly snapshot: () => string;
}

type Args = Readonly<Record<string, unknown>>;

const noExtra = (args: Args, allowed: readonly string[]): void => {
  const extra = Object.keys(args).find((k) => !allowed.includes(k));
  if (extra) throw new Error(`unknown argument "${extra}" (allowed: ${allowed.join(", ")})`);
};

const optString = (args: Args, key: string): string | null | undefined => {
  const v = args[key];
  if (v === undefined || v === null || typeof v === "string") return v;
  throw new Error(`\`${key}\` must be a string or null`);
};

const strings = (args: Args, key: string): readonly string[] | undefined => {
  const v = args[key];
  if (v === undefined) return undefined;
  if (Array.isArray(v) && v.every((x) => typeof x === "string")) return v;
  throw new Error(`\`${key}\` must be a list of spec IDs (strings)`);
};

const filterOf = (args: Args): SummaryFilter => {
  noExtra(args, ["phase", "spec"]);
  const { phase, spec } = args;
  if (phase !== undefined && !Number.isInteger(phase)) throw new Error("`phase` must be an integer");
  if (spec !== undefined && typeof spec !== "string") throw new Error("`spec` must be a spec ID string");
  return {
    ...(phase === undefined ? {} : { phase: phase as number }),
    ...(spec === undefined ? {} : { spec: spec as string }),
  };
};

const checkFilter = (model: Model, f: SummaryFilter): void => {
  if (f.phase !== undefined && !model.phases.some((p) => p.n === f.phase))
    throw new Error(
      `phase ${f.phase} not found (phases: ${model.phases.map((p) => p.n).join(", ") || "none"})`,
    );
  if (f.spec !== undefined && !model.specs.some((s) => s.id === f.spec))
    throw new Error(`spec ${f.spec} not found (specs: ${model.specs.map((s) => s.id).join(", ") || "none"})`);
};

const status = (ws: Workspace, args: Args): ToolOutput => {
  const filter = filterOf(args);
  const model = ws.model();
  checkFilter(model, filter);
  const summary = buildSummary(model, filter);
  return { text: renderSummary(summary), structured: { ...summary } };
};

const changeOf = (args: Args): DataChange => {
  if (typeof args["image"] === "string") {
    noExtra(args, ["image", "approved", "note"]);
    if (typeof args["approved"] !== "boolean")
      throw new Error("`approved` must be false for an image change");
    const note = optString(args, "note");
    return { image: args["image"], approved: args["approved"], ...(note === undefined ? {} : { note }) };
  }
  if (typeof args["milestone"] !== "string")
    throw new Error("pass either `milestone` (a milestone ID such as 1.2) or `image` (a gallery scene name)");
  noExtra(args, ["milestone", "status", "source", "specs", "note"]);
  const fields = { status: optString(args, "status"), source: optString(args, "source") };
  const note = optString(args, "note");
  const specs = strings(args, "specs");
  return {
    milestone: args["milestone"],
    ...(fields.status === undefined ? {} : { status: fields.status }),
    ...(fields.source === undefined ? {} : { source: fields.source }),
    ...(specs === undefined ? {} : { specs }),
    ...(note === undefined ? {} : { note }),
  };
};

const checkTargets = (model: Model, change: DataChange): string[] => {
  if (!("milestone" in change)) return [];
  const ids = model.phases.flatMap((p) => p.milestones.map((m) => m.id));
  if (ids.length > 0 && !ids.includes(change.milestone))
    throw new Error(
      `milestone ${change.milestone} is not in the roadmap's phase files (milestones: ${ids.join(", ")})`,
    );
  const unknown = (change.specs ?? []).filter((id) => !model.specs.some((s) => s.id === id));
  return unknown.length
    ? [`Warning: no spec file found for ${unknown.join(", ")}; each counts as one open criterion.`]
    : [];
};

const update = (ws: Workspace, args: Args): ToolOutput => {
  const change = changeOf(args);
  const warnings = checkTargets(ws.model(), change);
  ws.writeData(updateDataFile(ws.readData(), change, ws.dataFile));
  const target = "milestone" in change ? `milestone ${change.milestone}` : `image ${change.image}`;
  const summary = buildSummary(ws.model());
  const text = [`Updated ${ws.dataFile} (${target}).`, ...warnings, "", renderSummary(summary)].join("\n");
  return { text, structured: { dataFile: ws.dataFile, updated: target, warnings, summary: { ...summary } } };
};

const snapshot = (ws: Workspace, args: Args): ToolOutput => {
  noExtra(args, []);
  const index = ws.snapshot();
  const summary = buildSummary(ws.model());
  return {
    text: `Wrote ${index}\n\n${renderSummary(summary)}`,
    structured: { index, summary: { ...summary } },
  };
};

const STATUS_DESCRIPTION = `Read the project's progress: current phase, every milestone with its status, progress and where that status comes from (specs or a manual entry with its source), and the specs that still have unchecked acceptance criteria.
Use it before and after finishing work on a spec or milestone, to know what to update, and instead of opening the HTML dashboard or parsing the docs yourself.
Optional filters: \`phase\` (phase number) and \`spec\` (spec ID; shown even when complete). Read-only.`;

const UPDATE_DESCRIPTION = `Edit the progress data file (the only file this tool writes), keeping its key order, language and comments.
Milestone change: { milestone, status?, source?, specs?, note? }.
- Prefer \`specs\`: list the spec IDs that make up the milestone; its progress then comes from their acceptance checkboxes, which you tick in the spec files themselves (not here).
- \`status\` (done | doing | todo) is only for milestones tracked by hand and REQUIRES \`source\` (where it comes from, e.g. "README: demo recorded" or a commit hash). A milestone that has specs must not get a status. \`status: null\` removes a manual status.
- \`note: null\` removes the note; \`specs: []\` removes the list.
Image change: { image, approved: false, note? }. Never try to approve an image: approved: true is refused, approval is the project owner's decision.
Do not guess statuses. Update the data file in the same commit as the spec change it reflects.`;

const SNAPSHOT_DESCRIPTION = `Regenerate the HTML dashboard (like \`specpulse --no-render\`: no render command runs) and return its path plus the progress summary.
Use it when the user wants to look at the dashboard after a change. Not needed just to read progress: use progress_status.`;

const statusSchema = {
  type: "object",
  properties: {
    phase: { type: "integer", description: "Only this phase number." },
    spec: { type: "string", description: "Only this spec ID." },
  },
  additionalProperties: false,
};

const nullableString = (description: string) => ({ type: ["string", "null"], description });

const updateSchema = {
  type: "object",
  properties: {
    milestone: { type: "string", description: "Milestone ID as in the phase file, e.g. 1.2." },
    status: nullableString("Manual status: done, doing or todo (requires source). null removes it."),
    source: nullableString("Where the manual status comes from. Required with status."),
    specs: { type: "array", items: { type: "string" }, description: "Spec IDs that make up the milestone." },
    note: nullableString("Free note shown in the dashboard. null removes it."),
    image: { type: "string", description: "Gallery scene name (image changes only)." },
    approved: { type: "boolean", description: "Image changes only; must be false." },
  },
  additionalProperties: false,
};

export const progressTools = (ws: Workspace): readonly Tool[] => [
  {
    name: "progress_status",
    title: "Progress status",
    description: STATUS_DESCRIPTION,
    inputSchema: statusSchema,
    annotations: { readOnlyHint: true, openWorldHint: false },
    run: (args) => status(ws, args),
  },
  {
    name: "progress_update",
    title: "Update progress data",
    description: UPDATE_DESCRIPTION,
    inputSchema: updateSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    run: (args) => update(ws, args),
  },
  {
    name: "progress_snapshot",
    title: "Regenerate dashboard",
    description: SNAPSHOT_DESCRIPTION,
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    run: (args) => snapshot(ws, args),
  },
];

export const SERVER_INSTRUCTIONS = `specpulse tracks this project's progress from its roadmap, phase files, specs (acceptance checkboxes) and a small data file.
Call progress_status to read progress; call progress_update to change the data file (never edit statuses by guessing, never approve images); call progress_snapshot to regenerate the HTML dashboard.`;
