import type { Status } from "./data-file.ts";
import type { Commit } from "./git-log.ts";
import { SCRIPT, STYLE } from "./html-style.ts";
import type { Strings } from "./i18n.ts";
import type { MilestoneView, Model, PhaseView, SpecView } from "./model.ts";
import type { Snapshot } from "./timeline.ts";

export interface GalleryItem {
  readonly name: string;
  /** Paths relative to index.html. */
  readonly reference?: string;
  readonly render?: string;
  readonly renderError?: string;
  /** undefined = image not listed in the data file. */
  readonly approved?: boolean;
}

export interface RepoInfo {
  readonly branch: string;
  readonly lastCommit?: Commit;
  readonly clean: boolean;
  readonly generatedAt: string;
  /** Whether renders ran in this execution (false with --no-render). */
  readonly rendered: boolean;
}

export interface PageMeta {
  readonly title: string;
  /** Input paths listed in the subtitle. */
  readonly inputs: readonly string[];
  readonly specsDir: string;
  /** Present when the gallery is configured. */
  readonly gallery?: { readonly dir: string; readonly renderCommand: boolean; readonly historyDir: string };
}

export interface Page {
  readonly meta: PageMeta;
  readonly model: Model;
  readonly gallery: readonly GalleryItem[];
  readonly timeline: readonly Snapshot[];
  readonly repo: RepoInfo;
}

export const escapeHtml = (s: string): string => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** One-line markdown from tables: bold, `code` and links (kept as their text). */
export const inlineMd = (s: string): string =>
  escapeHtml(s.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1"))
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");

const pct = (p: number): string => `${Math.round(p * 100)}%`;
const bar = (p: number): string =>
  `<div class="bar${p > 0 && p < 1 ? " doing" : ""}"><i style="width:${pct(p)}"></i></div>`;
const day = (iso: string | undefined): string => (iso ? iso.slice(0, 10) : "—");

const pill = (t: Strings, s: Status): string => `<span class="pill s-${s}">${escapeHtml(t.status[s])}</span>`;

const milestoneHtml = (t: Strings, m: MilestoneView): string => {
  const chips = m.specs.length
    ? `<div class="chips">${m.specs.map((s) => `<span class="chip">${escapeHtml(s)}</span>`).join("")}</div>`
    : "";
  const note = m.note ? `<div class="note">${escapeHtml(m.note)}</div>` : "";
  return `<li><span class="id">${escapeHtml(m.id)}</span><div><div><strong>${escapeHtml(m.name)}</strong></div>
<div class="what">${inlineMd(m.delivery)}</div>${chips}${note}<div class="src"><b>${escapeHtml(t.sourceLabel)}</b> ${escapeHtml(t.source(m.source))}</div></div>
${pill(t, m.status)}</li>`;
};

const phaseHtml = (t: Strings, p: PhaseView): string => {
  const done = p.milestones.filter((m) => m.status === "done").length;
  const open = p.status === "doing" ? " open" : "";
  const list = p.milestones.length
    ? `<ul class="ms">${p.milestones.map((m) => milestoneHtml(t, m)).join("")}</ul>`
    : `<p class="ms what">${escapeHtml(t.noMilestones(p.file))}</p>`;
  return `<details class="phase st-${p.status}"${open}><summary><span class="num">${p.n}</span>
<div><div class="pname">${escapeHtml(p.name)}</div><div class="pfocus">${inlineMd(p.focus)} · ${escapeHtml(t.source(p.source))}</div></div>
<div class="pbar">${bar(p.progress)}<small>${escapeHtml(t.milestonesCount(done, p.milestones.length, pct(p.progress)))}</small></div>
${pill(t, p.status)}</summary>${list}</details>`;
};

const commitList = (t: Strings, commits: readonly Commit[]): string =>
  commits.length
    ? `<details><summary>${escapeHtml(t.commits(commits.length))}</summary><ul>${commits
        .map((c) => `<li><code>${escapeHtml(c.hash)}</code>${escapeHtml(c.subject)}</li>`)
        .join("")}</ul></details>`
    : `<small>${escapeHtml(t.none)}</small>`;

const specRow = (t: Strings, s: SpecView): string => {
  const p = s.total ? s.done / s.total : 0;
  return `<tr><td><strong>${escapeHtml(s.id)}</strong></td><td>${escapeHtml(s.title)}<br><small><code>${escapeHtml(s.file)}</code></small></td>
<td>${escapeHtml(s.milestone ?? "—")}</td><td class="acc">${bar(p)}<small>${escapeHtml(t.criteria(s.done, s.total))}</small></td>
<td>${commitList(t, s.commits)}</td><td>${day(s.lastDate)}</td></tr>`;
};

const specsHtml = (t: Strings, page: Page): string => {
  const specs = page.model.specs;
  if (!specs.length) return `<p class="empty">${escapeHtml(t.noSpecs(page.meta.specsDir))}</p>`;
  const head = t.th.map((h) => `<th>${escapeHtml(h)}</th>`).join("");
  return `<div class="tablebox"><table><thead><tr>${head}</tr></thead><tbody>${specs
    .map((s) => specRow(t, s))
    .join("")}</tbody></table></div>`;
};

const shot = (label: string, src: string | undefined, missing: string): string =>
  `<figure><figcaption>${escapeHtml(label)}</figcaption>${
    src
      ? `<a class="shot" href="${escapeHtml(src)}"><img src="${escapeHtml(src)}" alt="${escapeHtml(label)}"></a>`
      : `<div class="missing">${escapeHtml(missing)}</div>`
  }</figure>`;

const approvalBadge = (t: Strings, approved: boolean | undefined): string => {
  if (approved === false) return `<span class="badge">${escapeHtml(t.awaiting)}</span>`;
  if (approved === true) return `<span class="badge ok">${escapeHtml(t.approved)}</span>`;
  return "";
};

const whyNoRender = (t: Strings, g: GalleryItem, page: Page): string => {
  if (g.renderError) return t.renderFailed(g.renderError);
  if (!page.meta.gallery?.renderCommand) return t.renderOff;
  return page.repo.rendered ? t.renderFailed("—") : t.renderSkipped;
};

const galleryCard = (t: Strings, g: GalleryItem, page: Page, dir: string): string =>
  `<div class="card"><h3>${escapeHtml(g.name)} ${approvalBadge(t, g.approved)}</h3><div class="pair">
${shot(t.reference(dir), g.reference, t.noReference)}${shot(t.renderNow, g.render, whyNoRender(t, g, page))}</div></div>`;

const snapshotHtml = (t: Strings, s: Snapshot): string => {
  const [date = s.stamp, time = ""] = s.stamp.split("_");
  const thumbs = s.images
    .map(
      (i) => `<figure class="${i.change === "same" ? "same" : ""}"><figcaption>${escapeHtml(i.name)}
<span class="chg">· ${escapeHtml(t.change[i.change])}</span></figcaption><a class="shot" href="${escapeHtml(i.src)}">
<img loading="lazy" src="${escapeHtml(i.src)}" alt="${escapeHtml(i.name)}"></a></figure>`,
    )
    .join("");
  return `<div class="snap"><div class="when">${escapeHtml(date)}<small>${escapeHtml(time.replace(/-/g, ":"))}</small></div>
<div class="thumbs">${thumbs}</div></div>`;
};

const kpis = (t: Strings, page: Page): string => {
  const ms = page.model.phases.flatMap((p) => p.milestones);
  const specsDone = page.model.specs.filter((s) => s.total > 0 && s.done === s.total).length;
  const pending = page.gallery.filter((g) => g.approved === false).length;
  const current = page.model.phases.find((p) => p.status !== "done");
  const k = (v: string, label: string) =>
    `<div class="kpi"><b>${v}</b><small>${escapeHtml(label)}</small></div>`;
  const cards = [
    k(current ? t.kpiPhase(current.n) : "—", current ? current.name : t.kpiAllDone),
    k(`${ms.filter((m) => m.status === "done").length}/${ms.length}`, t.kpiMilestones),
    k(`${specsDone}/${page.model.specs.length}`, t.kpiSpecs),
  ];
  if (page.meta.gallery) cards.push(k(String(pending), t.kpiPending));
  return `<div class="kpis">${cards.join("")}</div>`;
};

const footerHtml = (t: Strings, r: RepoInfo): string => {
  const last = r.lastCommit
    ? `<span>${escapeHtml(t.lastCommit)} <b><code>${escapeHtml(r.lastCommit.hash)}</code> ${escapeHtml(r.lastCommit.subject)}</b> · ${day(r.lastCommit.date)}</span>`
    : "";
  const tree = r.clean
    ? `<b class="clean">${escapeHtml(t.clean)}</b>`
    : `<b class="dirty">${escapeHtml(t.dirty)}</b>`;
  return `<footer><span>${escapeHtml(t.branch)} <b>${escapeHtml(r.branch)}</b></span>${last}<span>${escapeHtml(t.tree)} ${tree}</span>
<span>${escapeHtml(t.generated(r.generatedAt))}</span></footer>`;
};

const timelineHtml = (t: Strings, s: readonly Snapshot[]): string =>
  s.length
    ? `<div class="timeline">${s.map((x) => snapshotHtml(t, x)).join("")}</div>`
    : `<p class="empty">${escapeHtml(t.noSnapshots)}</p>`;

const gallerySections = (t: Strings, page: Page): string => {
  const g = page.meta.gallery;
  if (!g) return "";
  return `<h2>${escapeHtml(t.galleryTitle)}</h2><p class="sub">${escapeHtml(t.gallerySub(g.dir, g.renderCommand))}</p>
<div class="gallery">${page.gallery.map((x) => galleryCard(t, x, page, g.dir)).join("")}</div>
<h2>${escapeHtml(t.timelineTitle)}</h2><p class="sub">${escapeHtml(t.timelineSub(g.historyDir))}</p>
${timelineHtml(t, page.timeline)}`;
};

/** The whole dashboard as one self-contained HTML document (no network, no external assets). */
export const renderHtml = (page: Page, t: Strings): string => `<!doctype html>
<html lang="${t.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(page.meta.title)} · ${escapeHtml(t.progress)}</title><style>${STYLE}</style></head><body><div class="wrap">
<header class="top"><div><h1>${escapeHtml(page.meta.title)} <span>· ${escapeHtml(t.progress)}</span></h1>
<p class="sub">${escapeHtml(t.subtitle(page.meta.inputs.join(", ")))}</p></div>
<button class="theme" type="button">${escapeHtml(t.theme)}</button></header>
${kpis(t, page)}
<h2>${escapeHtml(t.phasesTitle)}</h2><p class="sub">${escapeHtml(t.phasesSub)}</p>
<div class="phases">${page.model.phases.map((p) => phaseHtml(t, p)).join("")}</div>
<h2>${escapeHtml(t.specsTitle)}</h2><p class="sub">${escapeHtml(t.specsSub(page.meta.specsDir))}</p>
${specsHtml(t, page)}
${gallerySections(t, page)}
${footerHtml(t, page.repo)}
</div><script>${SCRIPT}</script></body></html>
`;
