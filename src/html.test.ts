import { describe, expect, it } from "vitest";
import { bundleClient, stripModuleSyntax } from "./client-bundle.ts";
import {
  type Ctx,
  escapeHtml,
  filterSpecs,
  inlineMd,
  NO_FILTERS,
  parseRoute,
  renderApp,
  renderView,
  visibleViews,
} from "./client-views.ts";
import { GUIDE } from "./guide.ts";
import { jsonForScript, LIVE_SLOT, type Page, renderHtml } from "./html.ts";
import { MESSAGES } from "./i18n.ts";
import type { LiveState } from "./live.ts";
import { buildModel } from "./model.ts";
import { commit, input } from "./testing/fixtures.ts";

const page = (over: Partial<Page> = {}): Page => ({
  meta: {
    title: "Demo",
    locale: "en",
    version: "1.2.3",
    inputs: ["docs/roadmap.md", "docs/progress.json"],
    roadmap: "docs/roadmap.md",
    specsDir: "docs/specs",
    gallery: { dir: "tests/golden", renderCommand: true, historyDir: ".cache/specpulse/history" },
    config: { title: "Demo" },
  },
  model: buildModel(input),
  gallery: [{ name: "card-tokens", reference: "img/reference-card-tokens.png", approved: false }],
  timeline: [],
  repo: {
    branch: "main",
    lastCommit: commit,
    clean: false,
    generatedAt: "2026-10-27 13:00:00",
    rendered: false,
  },
  ...over,
});

const ctx = (over: Partial<Ctx> = {}): Ctx => ({
  page: page(),
  t: MESSAGES.en,
  locale: "en",
  locales: [
    { id: "en", name: "English" },
    { id: "pt-BR", name: "Português" },
    { id: "es", name: "Español" },
  ],
  guide: GUIDE.en,
  route: { view: "overview" },
  filters: NO_FILTERS,
  now: Date.parse("2026-10-27T03:00:00Z"),
  ...over,
});

const noGallery = (): Page => {
  const { gallery: _g, ...meta } = page().meta;
  return page({ meta });
};

describe("helpers", () => {
  it("escapes text and converts one-line markdown", () => {
    expect(escapeHtml(`<a href="x">&'`)).toBe("&#60;a href=&#34;x&#34;&#62;&#38;&#39;");
    expect(inlineMd("**1.1** `new` [guide](a.md) <b>")).toBe(
      "<strong>1.1</strong> <code>new</code> guide &#60;b&#62;",
    );
  });
});

describe("routing", () => {
  it("parses hash routes, decoding the argument; unknown views fall back to the overview", () => {
    expect(parseRoute("#/specs/F-0001")).toEqual({ view: "specs", arg: "F-0001" });
    expect(parseRoute("#/phases/1")).toEqual({ view: "phases", arg: "1" });
    expect(parseRoute("#/guide")).toEqual({ view: "guide" });
    expect(parseRoute("#/nope")).toEqual({ view: "overview" });
    expect(parseRoute("")).toEqual({ view: "overview" });
    expect(parseRoute("#/specs/A%20B")).toEqual({ view: "specs", arg: "A B" });
    expect(parseRoute("#/specs/%E0%A4%A")).toEqual({ view: "specs", arg: "%E0%A4%A" });
  });

  it("hides views without data: no gallery → no gallery/timeline; live only when served", () => {
    expect(visibleViews(page(), false)).toEqual([
      "overview",
      "phases",
      "specs",
      "gallery",
      "timeline",
      "guide",
    ]);
    expect(visibleViews(noGallery(), true)).toEqual(["overview", "phases", "specs", "live", "guide"]);
  });

  it("a hidden view in the hash renders the overview and the nav marks it active", () => {
    const html = renderApp(ctx({ page: noGallery(), route: { view: "gallery" } }));
    expect(html).not.toContain('data-view="gallery"');
    expect(html).toMatch(/aria-current="page" class="active" data-view="overview"/);
  });
});

describe("views (data → HTML)", () => {
  it("overview: KPIs, current phase, pending images, footer", () => {
    const html = renderApp(ctx());
    expect(html).toContain("Phase 1");
    expect(html).toContain("images awaiting approval");
    expect(html).toContain('href="#/gallery">card-tokens</a>');
    expect(html).toContain("has changes");
    expect(html).toContain("<b>main</b>");
    expect(html).toContain("generated at 2026-10-27 13:00:00 by specpulse 1.2.3");
  });

  it("phases list and phase detail with sources", () => {
    const list = renderView(ctx({ route: { view: "phases" } }));
    expect(list).toContain("manual in docs/progress.json · README");
    expect(list).toContain('data-key="phase-1" open');
    const detail = renderView(ctx({ route: { view: "phases", arg: "1" } }));
    expect(detail).toContain("acceptance checkboxes of F-0001, F-0002 (3/6)");
    expect(detail).toContain('href="#/specs/F-0001"');
    expect(renderView(ctx({ route: { view: "phases", arg: "9" } }))).toContain("Phase 9 does not exist.");
  });

  it("specs table with filters and a detail page per spec", () => {
    const table = renderView(ctx({ route: { view: "specs" } }));
    expect(table).toContain('data-filter="text"');
    expect(table).toContain("2 of 2");
    const detail = renderView(ctx({ route: { view: "specs", arg: "F-0002" } }));
    expect(detail).toContain("Acceptance criteria");
    expect(detail).toContain("abc1234");
    expect(detail).toContain("f2.md");
    expect(renderView(ctx({ route: { view: "specs", arg: "X-1" } }))).toContain("Spec X-1 not found.");
  });

  it("filterSpecs by text, status and milestone", () => {
    const specs = buildModel(input).specs;
    expect(filterSpecs(specs, { ...NO_FILTERS, text: "op" }).map((s) => s.id)).toEqual(["F-0002"]);
    expect(filterSpecs(specs, { ...NO_FILTERS, status: "open" }).map((s) => s.id)).toEqual(["F-0001"]);
    expect(filterSpecs(specs, { ...NO_FILTERS, status: "complete" }).map((s) => s.id)).toEqual(["F-0002"]);
    expect(filterSpecs(specs, { ...NO_FILTERS, milestone: "1.1" })).toHaveLength(2);
    expect(filterSpecs(specs, { ...NO_FILTERS, milestone: "-" })).toHaveLength(0);
  });

  it("gallery: approval badge and why there is no render", () => {
    const html = renderView(ctx({ route: { view: "gallery" } }));
    expect(html).toContain("awaiting owner approval");
    expect(html).toContain("render skipped (--no-render)");
    expect(html).not.toContain('data-action="render"');
  });

  it("speaks Portuguese and Spanish", () => {
    const pt = renderApp(ctx({ t: MESSAGES["pt-BR"], locale: "pt-BR", route: { view: "phases", arg: "1" } }));
    expect(pt).toContain("checkboxes de aceite de F-0001, F-0002 (3/6)");
    expect(pt).toContain("em andamento");
    const es = renderApp(ctx({ t: MESSAGES.es, locale: "es", guide: GUIDE.es, route: { view: "guide" } }));
    expect(es).toContain("Servidor MCP");
    expect(es).toContain("Resumen");
  });

  it("shows model warnings on the overview", () => {
    const model = {
      ...buildModel(input),
      warnings: [{ kind: "milestone-conflict" as const, spec: "F-0001", frontmatter: "1.2", data: "1.1" }],
    };
    expect(renderView(ctx({ page: page({ model }) }))).toContain(
      "F-0001: its frontmatter says milestone 1.2",
    );
  });

  it("guide: every locale has the same sections, and the effective config is shown", () => {
    const ids = (l: keyof typeof GUIDE) => GUIDE[l].map((s) => s.id);
    expect(ids("pt-BR")).toEqual(ids("en"));
    expect(ids("es")).toEqual(ids("en"));
    const html = renderView(ctx({ route: { view: "guide", arg: "mcp" } }));
    expect(html).toContain("claude mcp add specpulse -- npx -y specpulse mcp");
    expect(html).toContain("&#34;title&#34;: &#34;Demo&#34;");
  });

  it("live view: feed, changed files, check and the sessions opt-in notice", () => {
    const state: LiveState = {
      commits: [
        { hash: "abc1234", date: "2026-10-27T02:58:00Z", subject: "feat: x (F-0002)", specs: ["F-0002"] },
      ],
      changed: [{ dir: "src", files: [{ code: " M", path: "src/a.ts" }] }],
      recent: [{ path: "src/a.ts", at: "2026-10-27T02:59:30Z" }],
      check: {
        status: "failed",
        command: "npm test",
        code: 1,
        seconds: 2,
        at: "2026-10-27T02:59:00Z",
        output: ["boom"],
      },
    };
    const live = { connected: true, token: "t", state, fresh: ["abc1234"] };
    const html = renderView(ctx({ live, route: { view: "live" } }));
    expect(html).toContain('class="fresh"');
    expect(html).toContain("2 min ago");
    expect(html).toContain("src/a.ts");
    expect(html).toContain("failed (exit 1)");
    expect(html).toContain("Off. Enable with --claude-sessions");
    expect(renderApp(ctx({ live }))).toContain('class="live-dot on"');
  });
});

describe("page shell", () => {
  it("embeds the data as script-safe JSON, has the live slot and no external assets", () => {
    const html = renderHtml(page({ meta: { ...page().meta, title: "</script><b>x" } }), "boot()");
    expect(html).toContain("<title>&#60;/script&#62;&#60;b&#62;x · progress</title>");
    expect(html).not.toContain("</script><b>");
    expect(html).toContain(LIVE_SLOT);
    expect(html).toContain('id="specpulse-data"');
    expect(html).not.toMatch(/(src|href)=["']?(https?:)?\/\//);
    expect(jsonForScript({ a: "</script>" })).toBe('{"a":"\\u003c/script>"}');
  });

  it("lang follows the configured locale", () => {
    expect(renderHtml(page({ meta: { ...page().meta, locale: "pt-BR" } }), "")).toContain('lang="pt-BR"');
  });
});

describe("client bundle", () => {
  it("drops imports and export keywords, wraps everything in one IIFE", () => {
    const a =
      'import { x } from "./a.ts";\nimport {\n  y,\n  z,\n} from "./b.ts";\nexport const f = () => 1;\nexport { q };';
    expect(stripModuleSyntax(a).trim()).toBe("const f = () => 1;");
    const b = bundleClient(["export function boot(){ return '</script>' }"], "boot");
    expect(b).toBe("(function(){\"use strict\";\nfunction boot(){ return '<\\/script>' }\nboot();})();");
  });
});
