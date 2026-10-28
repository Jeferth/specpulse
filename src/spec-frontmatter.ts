// Specs that describe themselves in a frontmatter block (id, title, status, milestone), the layout
// used by many docs-as-code tools. The body's checkboxes still count when present.
import type { SpecsConfig } from "./config.ts";
import { STATUS_ALIASES, type Status } from "./data-file.ts";
import { type FrontmatterValue, parseFrontmatter } from "./frontmatter.ts";
import {
  type Criterion,
  criteriaOf,
  idFromFileName,
  markdownAdapter,
  type Spec,
  type SpecAdapter,
  specOf,
  titleOf,
} from "./spec.ts";

/** Status words seen in the wild, on top of the data file's spellings. Matched lowercased. */
export const SPEC_STATUS_ALIASES: Readonly<Record<string, Status>> = {
  ...STATUS_ALIASES,
  complete: "done",
  completed: "done",
  closed: "done",
  shipped: "done",
  finished: "done",
  implemented: "done",
  concluído: "done",
  concluido: "done",
  "in-progress": "doing",
  in_progress: "doing",
  wip: "doing",
  active: "doing",
  started: "doing",
  ongoing: "doing",
  fazendo: "doing",
  "to do": "todo",
  "to-do": "todo",
  open: "todo",
  planned: "todo",
  pending: "todo",
  proposed: "todo",
  draft: "todo",
  backlog: "todo",
  pendente: "todo",
};

/** Synthetic counts for a spec without checkboxes, so `done/total` keeps meaning "progress". */
const STATUS_COUNTS: Record<Status, { done: number; total: number }> = {
  done: { done: 2, total: 2 },
  doing: { done: 1, total: 2 },
  todo: { done: 0, total: 2 },
};

const scalar = (v: FrontmatterValue | undefined): string | undefined => {
  const s = (Array.isArray(v) ? v[0] : v)?.trim();
  return s ? s : undefined;
};

export const statusFromText = (v: string | undefined): Status | undefined =>
  v === undefined ? undefined : SPEC_STATUS_ALIASES[v.trim().toLowerCase()];

const headingId = (body: string, specs: SpecsConfig): string | undefined =>
  markdownAdapter(body, "", { ...specs, idFrom: "heading" })?.id;

const idOf = (
  data: Readonly<Record<string, FrontmatterValue>>,
  body: string,
  file: string,
  specs: SpecsConfig,
): string | undefined => {
  const sources = {
    frontmatter: () => scalar(data["id"]),
    heading: () => headingId(body, specs),
    filename: () => idFromFileName(file, specs.idPattern),
  };
  if (specs.idFrom) return sources[specs.idFrom]();
  return sources.frontmatter() ?? sources.heading() ?? sources.filename();
};

const withStatus = (spec: Spec, status: Status | undefined, criteria: readonly Criterion[]): Spec => {
  if (!status) return spec;
  if (criteria.length > 0) return { ...spec, status };
  return { ...spec, ...STATUS_COUNTS[status], status, progressFrom: "status" };
};

/**
 * Frontmatter specs. A file without a (closed) frontmatter block is read as plain markdown, and
 * lines the minimal parser cannot read are skipped, so a malformed header never stops the run.
 */
export const frontmatterAdapter: SpecAdapter = (md, file, specs) => {
  const fm = parseFrontmatter(md);
  if (!fm) return markdownAdapter(md, file, specs);
  const id = idOf(fm.data, fm.body, file, specs);
  if (!id) return undefined;
  const criteria = criteriaOf(fm.body, specs.acceptanceHeading);
  const title = scalar(fm.data["title"]) ?? titleOf(fm.body, file, id);
  const milestone = scalar(fm.data["milestone"]);
  const spec = specOf(id, title, file, criteria);
  return withStatus(
    milestone ? { ...spec, milestone } : spec,
    statusFromText(scalar(fm.data["status"])),
    criteria,
  );
};
