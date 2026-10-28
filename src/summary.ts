// Plain-text progress summary for agents (`specpulse --summary`, MCP `progress_status`): enough to
// decide what to update without opening the HTML. English only, because agents read it, not users.
import type { MilestoneView, Model, PhaseView, Source, SpecView } from "./model.ts";

export interface SummaryFilter {
  /** Only this phase number. */
  readonly phase?: number;
  /** Only this spec ID (shown even when complete). */
  readonly spec?: string;
}

export interface SummaryMilestone {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly progress: number;
  readonly source: string;
  readonly specs: readonly string[];
  readonly note?: string;
}

export interface SummaryPhase {
  readonly n: number;
  readonly name: string;
  readonly status: string;
  readonly progress: number;
  readonly milestones: readonly SummaryMilestone[];
}

export interface SummarySpec {
  readonly id: string;
  readonly title: string;
  readonly file: string;
  readonly done: number;
  readonly total: number;
  /** Unchecked criteria; a spec without checkboxes counts as one. */
  readonly missing: number;
  readonly milestone?: string;
}

export interface Summary {
  readonly currentPhase?: { readonly n: number; readonly name: string };
  readonly phases: readonly SummaryPhase[];
  readonly openSpecs: readonly SummarySpec[];
}

const pct = (p: number): string => `${Math.round(p * 100)}%`;

export const sourceText = (s: Source): string => {
  switch (s.kind) {
    case "manual":
      return s.detail ? `manual (${s.file}: ${s.detail})` : `manual (${s.file}, no source given)`;
    case "specs":
      return `specs ${s.ids.join(", ")} (${s.done}/${s.total} criteria)`;
    case "none":
      return `no entry in ${s.file}`;
    case "phase":
      return `phase file ${s.file}`;
  }
};

/** First phase that is not done; the last one when everything is done. */
export const currentPhaseOf = (phases: readonly PhaseView[]): PhaseView | undefined =>
  phases.find((p) => p.status !== "done") ?? phases.at(-1);

const milestoneOf = (m: MilestoneView): SummaryMilestone => ({
  id: m.id,
  name: m.name,
  status: m.status,
  progress: m.progress,
  source: sourceText(m.source),
  specs: m.specs,
  ...(m.note ? { note: m.note } : {}),
});

const specOf = (s: SpecView): SummarySpec => ({
  id: s.id,
  title: s.title,
  file: s.file,
  done: s.done,
  total: s.total,
  missing: Math.max(s.total - s.done, s.total === 0 ? 1 : 0),
  ...(s.milestone ? { milestone: s.milestone } : {}),
});

export const buildSummary = (model: Model, filter: SummaryFilter = {}): Summary => {
  const current = currentPhaseOf(model.phases);
  const phases = model.phases
    .filter((p) => filter.phase === undefined || p.n === filter.phase)
    .map((p) => ({
      n: p.n,
      name: p.name,
      status: p.status,
      progress: p.progress,
      milestones: p.milestones.map(milestoneOf),
    }));
  const openSpecs = model.specs
    .map(specOf)
    .filter((s) => (filter.spec === undefined ? s.missing > 0 : s.id === filter.spec));
  return { ...(current ? { currentPhase: { n: current.n, name: current.name } } : {}), phases, openSpecs };
};

const milestoneLine = (m: SummaryMilestone): string =>
  [`  - ${m.id} ${m.name}: ${m.status} ${pct(m.progress)}`, m.source, m.note ? `note: ${m.note}` : ""]
    .filter(Boolean)
    .join(" | ");

const specLine = (s: SummarySpec): string => {
  const criteria = s.total === 0 ? "no acceptance checkboxes" : `${s.missing} of ${s.total} criteria open`;
  const where = s.milestone ? `milestone ${s.milestone}` : "no milestone";
  return `- ${s.id} ${s.title}: ${criteria} | ${where} | ${s.file}`;
};

/** Renders a summary as short plain text. */
export const renderSummary = (summary: Summary): string => {
  const cur = summary.currentPhase;
  const lines = [`Current phase: ${cur ? `${cur.n} ${cur.name}` : "none (no phases in the roadmap)"}`];
  if (summary.phases.length) lines.push("");
  for (const p of summary.phases) {
    lines.push(`Phase ${p.n} ${p.name}: ${p.status} ${pct(p.progress)}`);
    lines.push(...(p.milestones.length ? p.milestones.map(milestoneLine) : ["  (no milestones)"]));
  }
  const specs = summary.openSpecs;
  lines.push("", specs.length ? "Open specs:" : "Open specs: none", ...specs.map(specLine));
  return `${lines.join("\n")}\n`;
};

/** Short plain-text progress summary of a model. */
export const summaryText = (model: Model, filter: SummaryFilter = {}): string =>
  renderSummary(buildSummary(model, filter));
