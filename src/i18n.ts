// Dashboard text in each supported locale. Everything the page prints goes through here.
import type { Locale } from "./config.ts";
import type { Status } from "./data-file.ts";
import type { Source } from "./model.ts";
import type { Change } from "./timeline.ts";

export interface Strings {
  readonly lang: string;
  readonly progress: string;
  readonly status: Readonly<Record<Status, string>>;
  readonly change: Readonly<Record<Change, string>>;
  readonly subtitle: (inputs: string) => string;
  readonly theme: string;
  readonly kpiPhase: (n: number) => string;
  readonly kpiAllDone: string;
  readonly kpiMilestones: string;
  readonly kpiSpecs: string;
  readonly kpiPending: string;
  readonly phasesTitle: string;
  readonly phasesSub: string;
  readonly noMilestones: (file: string) => string;
  readonly milestonesCount: (done: number, total: number, pct: string) => string;
  readonly sourceLabel: string;
  readonly source: (s: Source) => string;
  readonly specsTitle: string;
  readonly specsSub: (dir: string) => string;
  readonly noSpecs: (dir: string) => string;
  readonly th: readonly [string, string, string, string, string, string];
  readonly criteria: (done: number, total: number) => string;
  readonly commits: (n: number) => string;
  readonly none: string;
  readonly galleryTitle: string;
  readonly gallerySub: (dir: string, render: boolean) => string;
  readonly reference: (dir: string) => string;
  readonly renderNow: string;
  readonly noReference: string;
  readonly renderFailed: (why: string) => string;
  readonly renderSkipped: string;
  readonly renderOff: string;
  readonly awaiting: string;
  readonly approved: string;
  readonly timelineTitle: string;
  readonly timelineSub: (dir: string) => string;
  readonly noSnapshots: string;
  readonly branch: string;
  readonly lastCommit: string;
  readonly tree: string;
  readonly clean: string;
  readonly dirty: string;
  readonly generated: (at: string) => string;
}

const en: Strings = {
  lang: "en",
  progress: "progress",
  status: { done: "done", doing: "in progress", todo: "to do" },
  change: { new: "new", changed: "changed", same: "same" },
  subtitle: (inputs) => `Everything derived from the repo: ${inputs} and git.`,
  theme: "light / dark",
  kpiPhase: (n) => `Phase ${n}`,
  kpiAllDone: "all phases done",
  kpiMilestones: "milestones done",
  kpiSpecs: "specs fully accepted",
  kpiPending: "images awaiting approval",
  phasesTitle: "Phases and milestones",
  phasesSub:
    'Status per milestone; the "source" line says where it came from. Only the phase in progress starts open.',
  noMilestones: (file) => `No milestone table in ${file}.`,
  milestonesCount: (d, t, p) => `${d}/${t} milestones · ${p}`,
  sourceLabel: "source:",
  source: (s) => {
    if (s.kind === "manual") return `manual in ${s.file}${s.detail ? ` · ${s.detail}` : ""}`;
    if (s.kind === "specs") return `acceptance checkboxes of ${s.ids.join(", ")} (${s.done}/${s.total})`;
    if (s.kind === "phase") return `milestones of ${s.file}`;
    return `no data in ${s.file}`;
  },
  specsTitle: "Specs",
  specsSub: (dir) => `Acceptance checkboxes in ${dir} and the commits that cite each ID.`,
  noSpecs: (dir) => `No specs in ${dir}.`,
  th: ["ID", "Title", "Milestone", "Acceptance", "Commits", "Last commit"],
  criteria: (d, t) => `${d}/${t} criteria`,
  commits: (n) => `${n} commit${n === 1 ? "" : "s"}`,
  none: "none",
  galleryTitle: "Gallery",
  gallerySub: (dir, render) => `Reference in ${dir}${render ? " × a fresh render." : "."}`,
  reference: (dir) => `reference · ${dir}`,
  renderNow: "render now",
  noReference: "no reference image",
  renderFailed: (why) => `render failed: ${why}`,
  renderSkipped: "render skipped (--no-render)",
  renderOff: "no render command configured",
  awaiting: "awaiting owner approval",
  approved: "approved",
  timelineTitle: "Timeline",
  timelineSub: (dir) => `One snapshot of the renders per run, newest first (${dir}).`,
  noSnapshots: "No snapshots yet: run specpulse without --no-render.",
  branch: "branch",
  lastCommit: "last commit",
  tree: "tree",
  clean: "clean",
  dirty: "has changes",
  generated: (at) => `generated at ${at} by specpulse`,
};

const ptBR: Strings = {
  lang: "pt-BR",
  progress: "progresso",
  status: { done: "feito", doing: "em andamento", todo: "a fazer" },
  change: { new: "nova", changed: "mudou", same: "igual" },
  subtitle: (inputs) => `Tudo derivado do repo: ${inputs} e git.`,
  theme: "claro / escuro",
  kpiPhase: (n) => `Fase ${n}`,
  kpiAllDone: "todas concluídas",
  kpiMilestones: "marcos feitos",
  kpiSpecs: "specs com aceite completo",
  kpiPending: "imagens aguardando aprovação",
  phasesTitle: "Fases e marcos",
  phasesSub:
    'Status por marco; a linha "fonte" diz de onde veio. Só a fase em andamento abre; clique nas outras para ver os marcos.',
  noMilestones: (file) => `Sem tabela de marcos em ${file}.`,
  milestonesCount: (d, t, p) => `${d}/${t} marcos · ${p}`,
  sourceLabel: "fonte:",
  source: (s) => {
    if (s.kind === "manual") return `manual em ${s.file}${s.detail ? ` · ${s.detail}` : ""}`;
    if (s.kind === "specs") return `checkboxes de aceite de ${s.ids.join(", ")} (${s.done}/${s.total})`;
    if (s.kind === "phase") return `marcos de ${s.file}`;
    return `sem dados em ${s.file}`;
  },
  specsTitle: "Specs",
  specsSub: (dir) => `Checkboxes de aceite de ${dir} e commits que citam o ID.`,
  noSpecs: (dir) => `Nenhum spec em ${dir}.`,
  th: ["ID", "Título", "Marco", "Aceite", "Commits", "Último commit"],
  criteria: (d, t) => `${d}/${t} critérios`,
  commits: (n) => `${n} commit${n === 1 ? "" : "s"}`,
  none: "nenhum",
  galleryTitle: "Galeria",
  gallerySub: (dir, render) => `Referência em ${dir}${render ? " × render fresco." : "."}`,
  reference: (dir) => `referência · ${dir}`,
  renderNow: "render agora",
  noReference: "sem PNG de referência",
  renderFailed: (why) => `render falhou: ${why}`,
  renderSkipped: "render pulado (--no-render)",
  renderOff: "sem comando de render configurado",
  awaiting: "aguardando aprovação do dono",
  approved: "aprovada",
  timelineTitle: "Linha do tempo",
  timelineSub: (dir) => `Um snapshot dos renders por execução, mais recentes primeiro (${dir}).`,
  noSnapshots: "Nenhum snapshot ainda: rode o specpulse sem --no-render.",
  branch: "branch",
  lastCommit: "último commit",
  tree: "árvore",
  clean: "limpa",
  dirty: "com mudanças",
  generated: (at) => `gerado em ${at} pelo specpulse`,
};

export const stringsFor = (locale: Locale): Strings => (locale === "pt-BR" ? ptBR : en);
