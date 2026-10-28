// The page shell: one self-contained HTML document with the data embedded as JSON and the client
// (client-views.ts + client-app.ts) inlined. The views themselves are rendered in the browser.
import type { Locale } from "./config.ts";
import type { Commit } from "./git-log.ts";
import { GUIDE, type GuideSection } from "./guide.ts";
import { STYLE } from "./html-style.ts";
import { MESSAGES, type Messages } from "./i18n.ts";
import type { Model } from "./model.ts";
import type { Snapshot } from "./timeline.ts";

export { escapeHtml, inlineMd } from "./client-views.ts";

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
  /** Locale from the config; each viewer can switch in the header. */
  readonly locale: Locale;
  readonly version: string;
  /** Input paths listed in the subtitle. */
  readonly inputs: readonly string[];
  readonly roadmap: string;
  readonly specsDir: string;
  /** Present when the gallery is configured. */
  readonly gallery?: { readonly dir: string; readonly renderCommand: boolean; readonly historyDir: string };
  /** The effective config, shown in the guide. */
  readonly config: unknown;
}

export interface Page {
  readonly meta: PageMeta;
  readonly model: Model;
  readonly gallery: readonly GalleryItem[];
  readonly timeline: readonly Snapshot[];
  readonly repo: RepoInfo;
}

/** Everything the client needs, embedded once in the page. */
export interface PageData {
  readonly page: Page;
  readonly messages: Readonly<Record<Locale, Messages>>;
  readonly guide: Readonly<Record<Locale, readonly GuideSection[]>>;
}

/** Placeholder the live server swaps for its session config; harmless as an HTML comment. */
export const LIVE_SLOT = "<!--specpulse-live-->";

/** JSON safe inside <script>: escaping every "<" rules out "</script>" and "<!--". */
export const jsonForScript = (value: unknown): string => JSON.stringify(value).replace(/</g, "\\u003c");

const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * The whole dashboard as one document (no network, no external assets). `script` is the bundled
 * client (see io/client-script.ts); keeping it a parameter keeps this function pure.
 */
export const renderHtml = (page: Page, script: string): string => {
  const t = MESSAGES[page.meta.locale];
  const data: PageData = { page, messages: MESSAGES, guide: GUIDE };
  return `<!doctype html>
<html lang="${t.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="generator" content="specpulse ${esc(page.meta.version)}">
<title>${esc(page.meta.title)} · ${esc(t.progress)}</title><style>${STYLE}</style></head>
<body><div id="sp-app"><noscript><p class="empty">${esc(t.noscript)}</p></noscript></div>
<script type="application/json" id="specpulse-data">${jsonForScript(data)}</script>${LIVE_SLOT}
<script>${script}</script></body></html>
`;
};
