import type { DataFile, MilestoneEntry, Status } from "./data-file.ts";
import { type Commit, commitsFor } from "./git-log.ts";
import type { Milestone, Phase } from "./roadmap.ts";
import type { Spec } from "./spec.ts";

/** Where a status came from; the dashboard prints it so nothing looks guessed. */
export type Source =
  | { readonly kind: "manual"; readonly file: string; readonly detail?: string }
  | { readonly kind: "specs"; readonly ids: readonly string[]; readonly done: number; readonly total: number }
  | { readonly kind: "none"; readonly file: string }
  | { readonly kind: "phase"; readonly file: string };

export interface MilestoneView extends Milestone {
  readonly status: Status;
  /** 0..1 */
  readonly progress: number;
  readonly source: Source;
  readonly specs: readonly string[];
  readonly note?: string;
}

export interface PhaseView extends Phase {
  readonly status: Status;
  readonly progress: number;
  readonly source: Source;
  readonly file: string;
  readonly milestones: readonly MilestoneView[];
}

export interface SpecView extends Spec {
  readonly milestone?: string;
  readonly commits: readonly Commit[];
  readonly lastDate?: string;
}

export interface ModelInput {
  readonly phases: readonly Phase[];
  readonly milestones: ReadonlyMap<number, readonly Milestone[]>;
  readonly specs: readonly Spec[];
  readonly commits: readonly Commit[];
  readonly data: DataFile;
  /** Path of the data file, as shown in sources. */
  readonly dataFile: string;
  /** Phase file path for phase N. */
  readonly phaseFile: (n: number) => string;
}

export interface Model {
  readonly phases: readonly PhaseView[];
  readonly specs: readonly SpecView[];
}

const weight: Record<Status, number> = { done: 1, doing: 0.5, todo: 0 };

export const statusOf = (progress: number): Status =>
  progress >= 1 ? "done" : progress > 0 ? "doing" : "todo";

const fromSpecs = (ids: readonly string[], specs: readonly Spec[]) => {
  const found = ids.map((id) => specs.find((s) => s.id === id));
  const done = found.reduce((n, s) => n + (s?.done ?? 0), 0);
  // A cited spec that is missing (or has no checkboxes) counts as one open criterion.
  const total = found.reduce((n, s) => n + Math.max(s?.total ?? 1, 1), 0);
  const progress = total === 0 ? 0 : done / total;
  const source: Source = { kind: "specs", ids, done, total };
  return { progress, source };
};

const resolve = (entry: MilestoneEntry | undefined, input: ModelInput) => {
  if (entry?.status) {
    const source: Source = {
      kind: "manual",
      file: input.dataFile,
      ...(entry.source ? { detail: entry.source } : {}),
    };
    return { progress: weight[entry.status], status: entry.status, source };
  }
  if (entry?.specs?.length) {
    const r = fromSpecs(entry.specs, input.specs);
    return { ...r, status: statusOf(r.progress) };
  }
  const source: Source = { kind: "none", file: input.dataFile };
  return { progress: 0, status: "todo" as const, source };
};

export const milestoneView = (m: Milestone, input: ModelInput): MilestoneView => {
  const entry = input.data.milestones[m.id];
  return {
    ...m,
    ...resolve(entry, input),
    specs: entry?.specs ?? [],
    ...(entry?.note ? { note: entry.note } : {}),
  };
};

const phaseView = (p: Phase, input: ModelInput): PhaseView => {
  const milestones = (input.milestones.get(p.n) ?? []).map((m) => milestoneView(m, input));
  const progress = milestones.length ? milestones.reduce((n, m) => n + m.progress, 0) / milestones.length : 0;
  const allDone = milestones.length > 0 && milestones.every((m) => m.status === "done");
  const file = input.phaseFile(p.n);
  return {
    ...p,
    status: allDone ? "done" : statusOf(progress),
    progress,
    milestones,
    file,
    source: { kind: "phase", file },
  };
};

const milestoneOfSpec = (id: string, data: DataFile): string | undefined =>
  Object.entries(data.milestones).find(([, e]) => e.specs?.includes(id))?.[0];

const specView = (s: Spec, input: ModelInput): SpecView => {
  const commits = commitsFor(s.id, input.commits);
  const milestone = milestoneOfSpec(s.id, input.data);
  const lastDate = commits[0]?.date;
  return { ...s, commits, ...(milestone ? { milestone } : {}), ...(lastDate ? { lastDate } : {}) };
};

export const buildModel = (input: ModelInput): Model => ({
  phases: input.phases.map((p) => phaseView(p, input)),
  specs: [...input.specs].sort((a, b) => a.id.localeCompare(b.id)).map((s) => specView(s, input)),
});
