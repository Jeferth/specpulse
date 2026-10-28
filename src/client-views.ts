// Pure view renderers of the dashboard: data → HTML strings. They run in the browser (bundled into
// the page by client-bundle.ts) and in Vitest. Only type imports are allowed here, because the
// bundle is this file's own text with the types stripped.
import type { Locale } from "./config.ts";
import type { Status } from "./data-file.ts";
import type { Commit } from "./git-log.ts";
import type { GuideBlock, GuideSection } from "./guide.ts";
import type { GalleryItem, Page } from "./html.ts";
import type { MessageKey, Messages } from "./i18n.ts";
import type { LiveState, SessionView } from "./live.ts";
import type { MilestoneView, ModelWarning, PhaseView, Source, SpecView } from "./model.ts";
import type { Snapshot } from "./timeline.ts";

export const VIEWS = ["overview", "phases", "specs", "gallery", "timeline", "live", "guide"] as const;
export type ViewId = (typeof VIEWS)[number];

/** Second key of the `g <key>` shortcut for each view. */
export const VIEW_KEYS: Readonly<Record<string, ViewId>> = {
  o: "overview",
  f: "phases",
  s: "specs",
  g: "gallery",
  t: "timeline",
  l: "live",
  h: "guide",
};

export interface Route {
  readonly view: ViewId;
  readonly arg?: string;
}

export type StatusFilter = "all" | "open" | "complete";

export interface Filters {
  readonly text: string;
  readonly status: StatusFilter;
  /** "" = all milestones, "-" = specs without a milestone, else a milestone ID. */
  readonly milestone: string;
}

export const NO_FILTERS: Filters = { text: "", status: "all", milestone: "" };

export interface LiveView {
  readonly connected: boolean;
  readonly token: string;
  readonly state?: LiveState;
  /** Message of the last render/check action, if any. */
  readonly notice?: string;
  readonly rendering?: boolean;
  /** Hashes of commits that just arrived, highlighted in the feed. */
  readonly fresh?: readonly string[];
}

export interface Ctx {
  readonly page: Page;
  readonly t: Messages;
  readonly locale: Locale;
  readonly locales: readonly { readonly id: Locale; readonly name: string }[];
  readonly guide: readonly GuideSection[];
  readonly route: Route;
  readonly filters: Filters;
  /** Present only when the page is served by `specpulse --serve`. */
  readonly live?: LiveView;
  /** Epoch ms, for relative times. */
  readonly now: number;
}

// ── helpers ────────────────────────────────────────────────────────────────────────────────────

export const escapeHtml = (s: string): string => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const esc = escapeHtml;

/** One-line markdown from tables and the guide: bold, `code` and links (kept as their text). */
export const inlineMd = (s: string): string =>
  esc(s.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1"))
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");

/** Fills `{name}` placeholders; unknown names are left as they are. */
export const fmt = (template: string, vars: Readonly<Record<string, string | number>> = {}): string =>
  template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));

const tx = (ctx: Ctx, key: MessageKey, vars?: Readonly<Record<string, string | number>>): string =>
  esc(fmt(ctx.t[key], vars));

export const hrefOf = (view: ViewId, arg?: string): string =>
  `#/${view}${arg === undefined ? "" : `/${encodeURIComponent(arg)}`}`;

const pct = (p: number): string => `${Math.round(p * 100)}%`;
const bar = (p: number): string =>
  `<div class="bar${p > 0 && p < 1 ? " doing" : ""}" role="img" aria-label="${pct(p)}"><i style="width:${pct(p)}"></i></div>`;
const day = (iso: string | undefined): string => (iso ? iso.slice(0, 10) : "—");

const STATUS_KEY: Readonly<Record<Status, MessageKey>> = {
  done: "statusDone",
  doing: "statusDoing",
  todo: "statusTodo",
};

export const statusText = (t: Messages, s: Status): string => t[STATUS_KEY[s]];
const pill = (ctx: Ctx, s: Status): string => `<span class="pill s-${s}">${esc(statusText(ctx.t, s))}</span>`;

export const sourceText = (t: Messages, s: Source): string => {
  if (s.kind === "manual") {
    const base = fmt(t.sourceManual, { file: s.file });
    return s.detail ? fmt(t.sourceDetail, { text: base, detail: s.detail }) : base;
  }
  if (s.kind === "specs") return fmt(t.sourceSpecs, { ids: s.ids.join(", "), done: s.done, total: s.total });
  if (s.kind === "phase") return fmt(t.sourcePhase, { file: s.file });
  return fmt(t.sourceNone, { file: s.file });
};

/** "5 min ago" style; falls back to the date for anything older than a week. */
export const ago = (t: Messages, iso: string, now: number): string => {
  const ms = now - Date.parse(iso);
  if (Number.isNaN(ms)) return iso;
  const min = Math.floor(ms / 60_000);
  if (min < 1) return t.justNow;
  if (min < 60) return fmt(t.minutesAgo, { n: min });
  const h = Math.floor(min / 60);
  if (h < 24) return fmt(t.hoursAgo, { n: h });
  const d = Math.floor(h / 24);
  return d < 7 ? fmt(t.daysAgo, { n: d }) : iso.slice(0, 10);
};

const commitsLabel = (ctx: Ctx, n: number): string => tx(ctx, n === 1 ? "commitsOne" : "commitsOther", { n });

export const isComplete = (s: SpecView): boolean => s.total > 0 && s.done === s.total;
const specProgress = (s: SpecView): number => (s.total ? s.done / s.total : 0);

const acceptanceText = (ctx: Ctx, s: SpecView): string =>
  s.progressFrom === "status" && s.status
    ? tx(ctx, "declaredStatus", { status: statusText(ctx.t, s.status) })
    : tx(ctx, "criteria", { done: s.done, total: s.total });

const empty = (html: string): string => `<p class="empty">${html}</p>`;
const section = (title: string, body: string, sub = ""): string =>
  `<section class="block"><h2>${title}</h2>${sub ? `<p class="sub">${sub}</p>` : ""}${body}</section>`;

// ── routing ────────────────────────────────────────────────────────────────────────────────────

const decode = (s: string): string => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

/** `#/specs/F-0001` → { view: "specs", arg: "F-0001" }. Unknown views fall back to the overview. */
export const parseRoute = (hash: string): Route => {
  const [view = "", ...rest] = hash.replace(/^#\/?/, "").split("/");
  if (!VIEWS.includes(view as ViewId)) return { view: "overview" };
  const arg = rest.filter((x) => x !== "").join("/");
  return arg ? { view: view as ViewId, arg: decode(arg) } : { view: view as ViewId };
};

/** Views with something to show: gallery/timeline need a gallery, live needs --serve. */
export const visibleViews = (page: Page, live: boolean): ViewId[] =>
  VIEWS.filter((v) => {
    if (v === "gallery" || v === "timeline") return page.meta.gallery !== undefined;
    if (v === "live") return live;
    return true;
  });

/** The route actually shown: a hidden view falls back to the overview. */
export const effectiveRoute = (ctx: Ctx): Route =>
  visibleViews(ctx.page, ctx.live !== undefined).includes(ctx.route.view) ? ctx.route : { view: "overview" };

const NAV_KEY: Readonly<Record<ViewId, MessageKey>> = {
  overview: "navOverview",
  phases: "navPhases",
  specs: "navSpecs",
  gallery: "navGallery",
  timeline: "navTimeline",
  live: "navLive",
  guide: "navGuide",
};

// ── chrome ─────────────────────────────────────────────────────────────────────────────────────

const liveDot = (ctx: Ctx): string => {
  if (!ctx.live) return "";
  const on = ctx.live.connected;
  return `<span class="live-dot ${on ? "on" : "off"}" role="status">${tx(ctx, on ? "liveConnected" : "liveReconnecting")}</span>`;
};

const langSelect = (ctx: Ctx): string =>
  `<label class="lang"><span class="sr">${tx(ctx, "language")}</span><select id="sp-lang" data-control="lang">${ctx.locales
    .map(
      (l) => `<option value="${esc(l.id)}"${l.id === ctx.locale ? " selected" : ""}>${esc(l.name)}</option>`,
    )
    .join("")}</select></label>`;

export const renderHeader = (ctx: Ctx): string => {
  const route = effectiveRoute(ctx);
  const links = visibleViews(ctx.page, ctx.live !== undefined)
    .map((v) => {
      const current = v === route.view ? ' aria-current="page" class="active"' : "";
      return `<a href="${hrefOf(v)}"${current} data-view="${v}">${tx(ctx, NAV_KEY[v])}</a>`;
    })
    .join("");
  return `<header class="top"><div class="bar-row"><div class="brand"><a class="home" href="${hrefOf("overview")}">${esc(ctx.page.meta.title)}</a>
<span>· ${tx(ctx, "progress")}</span></div><div class="tools">${liveDot(ctx)}${langSelect(ctx)}
<button class="theme" type="button" data-action="theme" title="${tx(ctx, "theme")}">◐ <span>${tx(ctx, "theme")}</span></button></div></div>
<nav class="views" aria-label="${tx(ctx, "navLabel")}" title="${tx(ctx, "keysHint")}">${links}</nav></header>`;
};

export const renderFooter = (ctx: Ctx): string => {
  const r = ctx.page.repo;
  const last = r.lastCommit
    ? `<span>${tx(ctx, "lastCommit")} <b><code>${esc(r.lastCommit.hash)}</code> ${esc(r.lastCommit.subject)}</b> · ${day(r.lastCommit.date)}</span>`
    : "";
  const tree = r.clean
    ? `<b class="clean">${tx(ctx, "clean")}</b>`
    : `<b class="dirty">${tx(ctx, "dirty")}</b>`;
  return `<footer><span>${tx(ctx, "branch")} <b>${esc(r.branch)}</b></span>${last}<span>${tx(ctx, "tree")} ${tree}</span>
<span>${tx(ctx, "generated", { at: r.generatedAt, version: ctx.page.meta.version })}</span></footer>`;
};

// ── overview ───────────────────────────────────────────────────────────────────────────────────

const currentPhase = (ctx: Ctx): PhaseView | undefined =>
  ctx.page.model.phases.find((p) => p.status !== "done");

const kpis = (ctx: Ctx): string => {
  const { phases, specs } = ctx.page.model;
  const ms = phases.flatMap((p) => p.milestones);
  const current = currentPhase(ctx);
  const k = (v: string, label: string, href?: string) => {
    const inner = `<b>${esc(v)}</b><small>${esc(label)}</small>`;
    return href ? `<a class="kpi" href="${href}">${inner}</a>` : `<div class="kpi">${inner}</div>`;
  };
  const phaseLabel = phases.length ? ctx.t.kpiAllDone : ctx.t.kpiNoPhases;
  const cards = [
    current
      ? k(fmt(ctx.t.kpiPhase, { n: current.n }), current.name, hrefOf("phases", String(current.n)))
      : k("—", phaseLabel),
    k(`${ms.filter((m) => m.status === "done").length}/${ms.length}`, ctx.t.kpiMilestones, hrefOf("phases")),
    k(`${specs.filter(isComplete).length}/${specs.length}`, ctx.t.kpiSpecs, hrefOf("specs")),
  ];
  if (ctx.page.meta.gallery) {
    const pending = ctx.page.gallery.filter((g) => g.approved === false).length;
    cards.push(k(String(pending), ctx.t.kpiPending, hrefOf("gallery")));
  }
  return `<div class="kpis">${cards.join("")}</div>`;
};

const phaseRow = (ctx: Ctx, p: PhaseView): string =>
  `<a class="prow st-${p.status}" href="${hrefOf("phases", String(p.n))}"><span class="num">${p.n}</span>
<span class="pname">${esc(p.name)}</span>${bar(p.progress)}<span class="pct">${pct(p.progress)}</span>${pill(ctx, p.status)}</a>`;

const recentSpecs = (ctx: Ctx): string => {
  const recent = ctx.page.model.specs
    .filter((s) => s.lastDate)
    .sort((a, b) => (b.lastDate ?? "").localeCompare(a.lastDate ?? ""))
    .slice(0, 6);
  if (!recent.length) return empty(tx(ctx, "overviewNoRecent"));
  return `<ul class="list">${recent
    .map(
      (s) => `<li><a href="${hrefOf("specs", s.id)}"><strong>${esc(s.id)}</strong> ${esc(s.title)}</a>
<span class="meta">${acceptanceText(ctx, s)} · ${esc(ago(ctx.t, s.lastDate ?? "", ctx.now))}</span></li>`,
    )
    .join("")}</ul>`;
};

const pendingImages = (ctx: Ctx): string => {
  const pending = ctx.page.gallery.filter((g) => g.approved === false);
  if (!pending.length) return empty(tx(ctx, "overviewNoPending"));
  return `<div class="chips">${pending
    .map((g) => `<a class="chip" href="${hrefOf("gallery")}">${esc(g.name)}</a>`)
    .join("")}</div>`;
};

const warningText = (ctx: Ctx, w: ModelWarning): string =>
  tx(ctx, "warnConflict", { spec: w.spec, frontmatter: w.frontmatter, data: w.data });

export const renderWarnings = (ctx: Ctx): string => {
  const ws = ctx.page.model.warnings;
  if (!ws.length) return "";
  return `<section class="block warn" role="note"><h2>${tx(ctx, "warningsTitle")}</h2><ul>${ws
    .map((w) => `<li>${warningText(ctx, w)}</li>`)
    .join("")}</ul></section>`;
};

export const renderOverview = (ctx: Ctx): string => {
  const { phases, specs } = ctx.page.model;
  const current = currentPhase(ctx);
  const start =
    phases.length === 0 && specs.length === 0
      ? `<p class="hint"><a href="${hrefOf("guide")}">${tx(ctx, "overviewStart")}</a></p>`
      : "";
  const progress = phases.length
    ? `<div class="prows">${phases.map((p) => phaseRow(ctx, p)).join("")}</div>`
    : empty(tx(ctx, "noPhases", { file: ctx.page.meta.roadmap }));
  const cur = current
    ? section(
        `${tx(ctx, "overviewCurrent")} · ${esc(fmt(ctx.t.kpiPhase, { n: current.n }))} ${esc(current.name)}`,
        milestoneList(ctx, current),
      )
    : "";
  const pending = ctx.page.meta.gallery ? section(tx(ctx, "overviewPending"), pendingImages(ctx)) : "";
  return `${start}${kpis(ctx)}${renderWarnings(ctx)}<div class="cols">
<div>${section(tx(ctx, "overviewPhases"), progress)}${cur}</div>
<div>${section(tx(ctx, "overviewRecent"), recentSpecs(ctx))}${pending}</div></div>`;
};

// ── phases ─────────────────────────────────────────────────────────────────────────────────────

const milestoneHtml = (ctx: Ctx, m: MilestoneView): string => {
  const chips = m.specs.length
    ? `<div class="chips">${m.specs.map((s) => `<a class="chip" href="${hrefOf("specs", s)}">${esc(s)}</a>`).join("")}</div>`
    : "";
  const note = m.note ? `<div class="note">${esc(m.note)}</div>` : "";
  return `<li><span class="id">${esc(m.id)}</span><div><div><strong>${esc(m.name)}</strong></div>
<div class="what">${inlineMd(m.delivery)}</div>${chips}${note}<div class="src"><b>${tx(ctx, "sourceLabel")}</b> ${esc(sourceText(ctx.t, m.source))}</div></div>
<div class="mstat">${pill(ctx, m.status)}${bar(m.progress)}</div></li>`;
};

const milestoneList = (ctx: Ctx, p: PhaseView): string =>
  p.milestones.length
    ? `<ul class="ms">${p.milestones.map((m) => milestoneHtml(ctx, m)).join("")}</ul>`
    : empty(tx(ctx, "noMilestones", { file: p.file }));

const phaseCard = (ctx: Ctx, p: PhaseView): string => {
  const done = p.milestones.filter((m) => m.status === "done").length;
  const open = p.status === "doing" ? " open" : "";
  return `<details class="phase st-${p.status}" data-key="phase-${p.n}"${open}><summary><span class="num">${p.n}</span>
<div><div class="pname"><a href="${hrefOf("phases", String(p.n))}">${esc(p.name)}</a></div><div class="pfocus">${inlineMd(p.focus)}</div></div>
<div class="pbar">${bar(p.progress)}<small>${tx(ctx, "milestonesCount", { done, total: p.milestones.length, pct: pct(p.progress) })}</small></div>
${pill(ctx, p.status)}</summary>${milestoneList(ctx, p)}</details>`;
};

const phaseDetail = (ctx: Ctx, n: string): string => {
  const p = ctx.page.model.phases.find((x) => String(x.n) === n);
  const back = `<p><a href="${hrefOf("phases")}">${tx(ctx, "allPhases")}</a></p>`;
  if (!p) return `${back}${empty(tx(ctx, "phaseNotFound", { n }))}`;
  const done = p.milestones.filter((m) => m.status === "done").length;
  const test = p.test ? `<p class="sub"><b>${tx(ctx, "howToTest")}:</b> ${inlineMd(p.test)}</p>` : "";
  return `${back}<div class="detail st-${p.status}"><div class="dhead"><span class="num">${p.n}</span><div><h1>${esc(p.name)}</h1>
<p class="sub">${inlineMd(p.focus)} · ${esc(sourceText(ctx.t, p.source))}</p></div>${pill(ctx, p.status)}</div>
<div class="pbar wide">${bar(p.progress)}<small>${tx(ctx, "milestonesCount", { done, total: p.milestones.length, pct: pct(p.progress) })}</small></div>
${test}${milestoneList(ctx, p)}</div>`;
};

export const renderPhases = (ctx: Ctx, arg?: string): string => {
  if (arg !== undefined) return phaseDetail(ctx, arg);
  const phases = ctx.page.model.phases;
  const body = phases.length
    ? `<div class="phases">${phases.map((p) => phaseCard(ctx, p)).join("")}</div>`
    : empty(tx(ctx, "noPhases", { file: ctx.page.meta.roadmap }));
  return section(tx(ctx, "phasesTitle"), body, tx(ctx, "phasesSub"));
};

// ── specs ──────────────────────────────────────────────────────────────────────────────────────

/** Specs matching the filters, in model order. */
export const filterSpecs = (specs: readonly SpecView[], f: Filters): SpecView[] => {
  const q = f.text.trim().toLowerCase();
  return specs.filter((s) => {
    if (q && !`${s.id} ${s.title}`.toLowerCase().includes(q)) return false;
    if (f.status === "open" && isComplete(s)) return false;
    if (f.status === "complete" && !isComplete(s)) return false;
    if (f.milestone === "-") return s.milestone === undefined;
    return f.milestone === "" || s.milestone === f.milestone;
  });
};

const specRow = (ctx: Ctx, s: SpecView): string =>
  `<tr data-href="${hrefOf("specs", s.id)}"><td><a href="${hrefOf("specs", s.id)}"><strong>${esc(s.id)}</strong></a></td>
<td>${esc(s.title)}<br><small><code>${esc(s.file)}</code></small></td><td>${esc(s.milestone ?? "—")}</td>
<td class="acc">${bar(specProgress(s))}<small>${acceptanceText(ctx, s)}</small></td>
<td>${s.commits.length ? commitsLabel(ctx, s.commits.length) : tx(ctx, "none")}</td><td>${day(s.lastDate)}</td></tr>`;

/** The filtered table only, so typing in the filter re-renders this part and keeps focus. */
export const renderSpecResults = (ctx: Ctx): string => {
  const all = ctx.page.model.specs;
  const shown = filterSpecs(all, ctx.filters);
  const count = `<p class="sub count">${tx(ctx, "shownOf", { shown: shown.length, total: all.length })}</p>`;
  if (!shown.length) return `${count}${empty(tx(ctx, "noMatches"))}`;
  const th = (["thId", "thTitle", "thMilestone", "thAcceptance", "thCommits", "thLast"] as const)
    .map((k) => `<th>${tx(ctx, k)}</th>`)
    .join("");
  return `${count}<div class="tablebox"><table><thead><tr>${th}</tr></thead><tbody>${shown
    .map((s) => specRow(ctx, s))
    .join("")}</tbody></table></div>`;
};

const option = (value: string, label: string, selected: string): string =>
  `<option value="${esc(value)}"${value === selected ? " selected" : ""}>${esc(label)}</option>`;

const specFilters = (ctx: Ctx): string => {
  const f = ctx.filters;
  const milestones = [
    ...new Set(ctx.page.model.specs.map((s) => s.milestone).filter((m) => m !== undefined)),
  ].sort();
  const status = (["all", "open", "complete"] as const)
    .map((v) => {
      const key: MessageKey = v === "all" ? "filterAll" : v === "open" ? "filterOpen" : "filterComplete";
      return option(v, ctx.t[key], f.status);
    })
    .join("");
  const ms = [
    option("", ctx.t.filterAllMilestones, f.milestone),
    ...milestones.map((m) => option(m, m, f.milestone)),
    option("-", ctx.t.filterNoMilestone, f.milestone),
  ].join("");
  return `<div class="filters"><input id="sp-filter-text" type="search" data-filter="text" value="${esc(f.text)}" placeholder="${tx(ctx, "filterText")}" aria-label="${tx(ctx, "filterText")}">
<label>${tx(ctx, "filterStatus")} <select id="sp-filter-status" data-filter="status">${status}</select></label>
<label>${tx(ctx, "filterMilestone")} <select id="sp-filter-milestone" data-filter="milestone">${ms}</select></label></div>`;
};

const commitItems = (commits: readonly Commit[]): string =>
  `<ul class="commits">${commits
    .map(
      (c) =>
        `<li><code>${esc(c.hash)}</code> ${esc(c.subject)} <span class="meta">${day(c.date)}</span></li>`,
    )
    .join("")}</ul>`;

const specDetail = (ctx: Ctx, id: string): string => {
  const s = ctx.page.model.specs.find((x) => x.id === id);
  const back = `<p><a href="${hrefOf("specs")}">${tx(ctx, "allSpecs")}</a></p>`;
  if (!s) return `${back}${empty(tx(ctx, "specNotFound", { id }))}`;
  const status: Status = s.progressFrom === "status" && s.status ? s.status : statusOfSpec(s);
  const milestone = s.milestone
    ? ` · ${tx(ctx, "thMilestone")} <a href="${hrefOf("phases", s.milestone.split(".")[0] ?? "")}">${esc(s.milestone)}</a>`
    : "";
  const criteria = s.criteria.length
    ? `<ul class="criteria">${s.criteria
        .map(
          (c) =>
            `<li class="${c.done ? "ok" : ""}"><span aria-hidden="true">${c.done ? "☑" : "☐"}</span> ${inlineMd(c.text)}</li>`,
        )
        .join("")}</ul>`
    : empty(tx(ctx, "noCriteria"));
  const commits = s.commits.length ? commitItems(s.commits) : empty(tx(ctx, "none"));
  return `${back}<div class="detail"><div class="dhead"><div><h1><span class="id">${esc(s.id)}</span> ${esc(s.title)}</h1>
<p class="sub">${tx(ctx, "specFile")} <code>${esc(s.file)}</code>${milestone}</p></div>${pill(ctx, status)}</div>
<div class="pbar wide">${bar(specProgress(s))}<small>${acceptanceText(ctx, s)}</small></div>
${section(tx(ctx, "criteriaTitle"), criteria)}${section(`${tx(ctx, "thCommits")} · ${commitsLabel(ctx, s.commits.length)}`, commits)}</div>`;
};

const statusOfSpec = (s: SpecView): Status => {
  const p = specProgress(s);
  return p >= 1 ? "done" : p > 0 ? "doing" : "todo";
};

export const renderSpecs = (ctx: Ctx, arg?: string): string => {
  if (arg !== undefined) return specDetail(ctx, arg);
  const dir = ctx.page.meta.specsDir;
  const body = ctx.page.model.specs.length
    ? `${specFilters(ctx)}<div id="sp-spec-results">${renderSpecResults(ctx)}</div>`
    : empty(tx(ctx, "noSpecs", { dir }));
  return section(tx(ctx, "specsTitle"), body, tx(ctx, "specsSub", { dir }));
};

// ── gallery and timeline ───────────────────────────────────────────────────────────────────────

const shot = (label: string, src: string | undefined, missing: string): string =>
  `<figure><figcaption>${esc(label)}</figcaption>${
    src
      ? `<a class="shot" href="${esc(src)}"><img src="${esc(src)}" alt="${esc(label)}" loading="lazy"></a>`
      : `<div class="missing">${esc(missing)}</div>`
  }</figure>`;

const approvalBadge = (ctx: Ctx, approved: boolean | undefined): string => {
  if (approved === false) return `<span class="badge">${tx(ctx, "awaiting")}</span>`;
  if (approved === true) return `<span class="badge ok">${tx(ctx, "approved")}</span>`;
  return "";
};

const whyNoRender = (ctx: Ctx, g: GalleryItem): string => {
  if (g.renderError) return fmt(ctx.t.renderFailed, { why: g.renderError });
  if (!ctx.page.meta.gallery?.renderCommand) return ctx.t.renderOff;
  return ctx.page.repo.rendered ? fmt(ctx.t.renderFailed, { why: "—" }) : ctx.t.renderSkipped;
};

const galleryCard = (ctx: Ctx, g: GalleryItem, dir: string): string =>
  `<div class="card"><h3>${esc(g.name)} ${approvalBadge(ctx, g.approved)}</h3><div class="pair">
${shot(fmt(ctx.t.reference, { dir }), g.reference, ctx.t.noReference)}${shot(ctx.t.renderNow, g.render, whyNoRender(ctx, g))}</div></div>`;

const renderButton = (ctx: Ctx): string => {
  if (!ctx.live || !ctx.page.meta.gallery?.renderCommand) return "";
  const busy = ctx.live.rendering === true;
  const notice = ctx.live.notice ? `<span class="notice" role="status">${esc(ctx.live.notice)}</span>` : "";
  return `<div class="actions"><button type="button" data-action="render"${busy ? " disabled" : ""}>${tx(ctx, busy ? "renderRunning" : "renderAll")}</button>${notice}</div>`;
};

export const renderGallery = (ctx: Ctx): string => {
  const g = ctx.page.meta.gallery;
  if (!g) return "";
  const sub = tx(ctx, g.renderCommand ? "gallerySubRender" : "gallerySub", { dir: g.dir });
  return section(
    tx(ctx, "galleryTitle"),
    `${renderButton(ctx)}<div class="gallery">${ctx.page.gallery.map((x) => galleryCard(ctx, x, g.dir)).join("")}</div>`,
    sub,
  );
};

const CHANGE_KEY = { new: "changeNew", changed: "changeChanged", same: "changeSame" } as const;

const snapshotHtml = (ctx: Ctx, s: Snapshot): string => {
  const [date = s.stamp, time = ""] = s.stamp.split("_");
  const thumbs = s.images
    .map(
      (i) => `<figure class="${i.change === "same" ? "same" : ""}"><figcaption>${esc(i.name)}
<span class="chg">· ${tx(ctx, CHANGE_KEY[i.change])}</span></figcaption><a class="shot" href="${esc(i.src)}">
<img loading="lazy" src="${esc(i.src)}" alt="${esc(i.name)}"></a></figure>`,
    )
    .join("");
  return `<div class="snap"><div class="when">${esc(date)}<small>${esc(time.replace(/-/g, ":"))}</small></div>
<div class="thumbs">${thumbs}</div></div>`;
};

export const renderTimeline = (ctx: Ctx): string => {
  const g = ctx.page.meta.gallery;
  if (!g) return "";
  const body = ctx.page.timeline.length
    ? `<div class="timeline">${ctx.page.timeline.map((x) => snapshotHtml(ctx, x)).join("")}</div>`
    : empty(tx(ctx, "noSnapshots"));
  return section(tx(ctx, "timelineTitle"), body, tx(ctx, "timelineSub", { dir: g.historyDir }));
};

// ── live ───────────────────────────────────────────────────────────────────────────────────────

const liveCommits = (ctx: Ctx, s: LiveState): string =>
  s.commits.length
    ? `<ul class="feed">${s.commits
        .map((c) => {
          const specs = c.specs
            .map((id) => `<a class="chip" href="${hrefOf("specs", id)}">${esc(id)}</a>`)
            .join("");
          const fresh = ctx.live?.fresh?.includes(c.hash) ? ' class="fresh"' : "";
          return `<li data-hash="${esc(c.hash)}"${fresh}><code>${esc(c.hash)}</code> <span>${esc(c.subject)}</span>
<span class="meta">${esc(ago(ctx.t, c.date, ctx.now))}</span>${specs ? `<span class="chips">${specs}</span>` : ""}</li>`;
        })
        .join("")}</ul>`
    : empty(tx(ctx, "liveNoCommits"));

const liveChanged = (ctx: Ctx, s: LiveState): string =>
  s.changed.length
    ? s.changed
        .map(
          (g) =>
            `<div class="fgroup"><div class="fdir"><code>${esc(g.dir)}/</code></div><ul>${g.files
              .map(
                (f) => `<li><code class="code">${esc(f.code.replace(/ /g, "·"))}</code> ${esc(f.path)}</li>`,
              )
              .join("")}</ul></div>`,
        )
        .join("")
    : empty(tx(ctx, "liveNoChanged"));

const liveRecent = (ctx: Ctx, s: LiveState): string =>
  s.recent.length
    ? `<ul class="list">${s.recent
        .map(
          (f) =>
            `<li><code>${esc(f.path)}</code> <span class="meta">${esc(ago(ctx.t, f.at, ctx.now))}</span></li>`,
        )
        .join("")}</ul>`
    : empty(tx(ctx, "liveNoRecent"));

const checkLabel = (ctx: Ctx, s: LiveState): string => {
  const c = s.check;
  if (c.status === "running") return tx(ctx, "liveCheckRunning");
  if (c.status === "passed") return tx(ctx, "liveCheckPassed");
  if (c.status === "failed") return tx(ctx, "liveCheckFailed", { code: c.code ?? "?" });
  return tx(ctx, "liveCheckIdle");
};

const liveCheck = (ctx: Ctx, s: LiveState): string => {
  const c = s.check;
  if (c.status === "none") return empty(tx(ctx, "liveCheckNone"));
  const running = c.status === "running";
  const took =
    c.at !== undefined
      ? `<p class="sub">${tx(ctx, "liveCheckTook", { command: c.command ?? "", seconds: c.seconds ?? 0, at: ago(ctx.t, c.at, ctx.now) })}</p>`
      : `<p class="sub"><code>${esc(c.command ?? "")}</code></p>`;
  const out = c.output?.length ? `<pre class="out">${esc(c.output.join("\n"))}</pre>` : "";
  return `<div class="check c-${c.status}"><button type="button" data-action="check"${running ? " disabled" : ""}>${tx(ctx, "liveRunCheck")}</button>
<span class="cstat" role="status">${checkLabel(ctx, s)}</span></div>${took}${out}`;
};

const sessionHtml = (ctx: Ctx, s: SessionView): string => {
  const tools = s.tools
    .slice(0, 12)
    .map(
      (x) =>
        `<li><b>${esc(x.name)}</b>${x.file ? ` <code>${esc(x.file)}</code>` : ""} <span class="meta">${esc(ago(ctx.t, x.at, ctx.now))}</span></li>`,
    )
    .join("");
  const commits = s.commits.length
    ? `<div class="sub">${tx(ctx, "liveSessionCommits")}: ${s.commits.map((c) => esc(c)).join(" · ")}</div>`
    : "";
  return `<details class="session" data-key="session-${esc(s.id)}" open><summary><b>${tx(ctx, "liveSession", { id: s.id.slice(0, 8) })}</b>
<span class="meta">${tx(ctx, "liveSessionTimes", { start: ago(ctx.t, s.start, ctx.now), last: ago(ctx.t, s.last, ctx.now) })}</span></summary>
<ul class="list">${tools}</ul>${commits}</details>`;
};

const liveSessions = (ctx: Ctx, s: LiveState): string => {
  const privacy = `<p class="privacy" role="note">${tx(ctx, "liveSessionsPrivacy")}</p>`;
  if (s.sessions === undefined) return `${empty(tx(ctx, "liveSessionsOff"))}${privacy}`;
  const list = s.sessions.length
    ? s.sessions.map((x) => sessionHtml(ctx, x)).join("")
    : empty(tx(ctx, "liveNoSessions"));
  return `${privacy}${list}`;
};

export const renderLive = (ctx: Ctx): string => {
  const s = ctx.live?.state;
  if (!s) return section(tx(ctx, "liveTitle"), empty(tx(ctx, "liveReconnecting")), tx(ctx, "liveSub"));
  return `<section class="block"><h2>${tx(ctx, "liveTitle")}</h2><p class="sub">${tx(ctx, "liveSub")}</p></section>
<div class="cols"><div>${section(tx(ctx, "liveCommits"), liveCommits(ctx, s))}${section(tx(ctx, "liveCheck"), liveCheck(ctx, s))}</div>
<div>${section(tx(ctx, "liveChanged"), liveChanged(ctx, s))}${section(tx(ctx, "liveRecent"), liveRecent(ctx, s))}</div></div>
${section(tx(ctx, "liveSessions"), liveSessions(ctx, s))}`;
};

// ── guide ──────────────────────────────────────────────────────────────────────────────────────

const guideBlock = (b: GuideBlock): string => {
  if ("p" in b) return `<p>${inlineMd(b.p)}</p>`;
  if ("list" in b) return `<ul>${b.list.map((x) => `<li>${inlineMd(x)}</li>`).join("")}</ul>`;
  const label = b.label ? `<div class="code-label">${esc(b.label)}</div>` : "";
  return `<div class="codebox">${label}<pre><code>${esc(b.code)}</code></pre></div>`;
};

export const renderGuide = (ctx: Ctx): string => {
  const toc = ctx.guide
    .map((s) => `<li><a href="${hrefOf("guide", s.id)}" data-section="${esc(s.id)}">${esc(s.title)}</a></li>`)
    .join("");
  const sections = ctx.guide
    .map(
      (s) =>
        `<section class="gsec" id="guide-${esc(s.id)}"><h2>${esc(s.title)}</h2>${s.blocks.map(guideBlock).join("")}</section>`,
    )
    .join("");
  const config = `<section class="gsec" id="guide-this"><h2>${tx(ctx, "guideYourConfig")}</h2>
<div class="codebox"><pre><code>${esc(JSON.stringify(ctx.page.meta.config, null, 2))}</code></pre></div></section>`;
  return `<section class="block"><h2>${tx(ctx, "guideTitle")}</h2><p class="sub">${tx(ctx, "guideSub")}</p></section>
<div class="guide"><nav class="toc" aria-label="${tx(ctx, "guideContents")}"><b>${tx(ctx, "guideContents")}</b><ol>${toc}
<li><a href="${hrefOf("guide", "this")}">${tx(ctx, "guideYourConfig")}</a></li></ol></nav><div class="gbody">${sections}${config}</div></div>`;
};

// ── app ────────────────────────────────────────────────────────────────────────────────────────

/** HTML of the current view (without header and footer). */
export const renderView = (ctx: Ctx): string => {
  const r = effectiveRoute(ctx);
  if (r.view === "phases") return renderPhases(ctx, r.arg);
  if (r.view === "specs") return renderSpecs(ctx, r.arg);
  if (r.view === "gallery") return renderGallery(ctx);
  if (r.view === "timeline") return renderTimeline(ctx);
  if (r.view === "live") return renderLive(ctx);
  if (r.view === "guide") return renderGuide(ctx);
  return renderOverview(ctx);
};

export const renderApp = (ctx: Ctx): string =>
  `${renderHeader(ctx)}<main id="sp-view" class="wrap" tabindex="-1">${renderView(ctx)}</main><div class="wrap">${renderFooter(ctx)}</div>`;
