import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { NO_FILTERS, renderView } from "./client-views.ts";
import { buildPage, generate } from "./generate.ts";
import type { Page } from "./html.ts";
import { MESSAGES } from "./i18n.ts";
import { clientScript } from "./io/client-script.ts";
import { renderCommand } from "./io/images.ts";
import { loadConfig } from "./io/load-config.ts";

const root = mkdtempSync(join(tmpdir(), "specpulse-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

const put = (rel: string, text: string): void => {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), text);
};

put("package.json", '{"name":"demo-app"}');
put(
  "docs/roadmap.md",
  "| Phase | Name | Test | Focus |\n|---|---|---|---|\n| [1](phase-1/README.md) | Core | t | f |\n",
);
put("docs/phase-1/README.md", "| **1.1 Parser** | parses | x |\n| **1.2 CLI** | runs | y |\n");
put("docs/specs/APP-001-parser.md", "# APP-001 · Parser\n\n- [x] a\n- [ ] b\n");
put("docs/progress.json", '{"milestones":{"1.1":{"specs":["APP-001"]},"1.2":{"status":"done"}}}');
put("gallery/home.png", "not really a png");

const view = (page: Page, view: "overview" | "phases" | "gallery", arg?: string): string =>
  renderView({
    page,
    t: MESSAGES.en,
    locale: "en",
    locales: [],
    guide: [],
    route: arg === undefined ? { view } : { view, arg },
    filters: NO_FILTERS,
    now: Date.now(),
  });

describe("generate", () => {
  it("works with defaults and no git, titled after package.json", () => {
    const { config } = loadConfig(root);
    const { index, page } = generate({ root, config, render: true, now: new Date(2026, 9, 27, 13, 0, 0) });
    const html = readFileSync(index, "utf8");
    expect(index).toBe(join(root, ".cache/specpulse/index.html"));
    expect(html).toContain("<title>demo-app · progress</title>");
    expect(html).toContain('"generatedAt":"2026-10-27 13:00:00"');
    expect(view(page, "phases", "1")).toContain("acceptance checkboxes of APP-001 (1/2)");
    expect(view(page, "phases")).toContain("1/2 milestones · 75%");
    expect(page.meta.gallery).toBeUndefined();
  });

  it("reads specpulse.config.json, copies references and explains the missing render", () => {
    put("specpulse.config.json", '{"title":"Demo","gallery":{"dir":"gallery"},"outDir":"out"}');
    const { config, path } = loadConfig(root);
    expect(path).toBe(join(root, "specpulse.config.json"));
    const { page } = generate({ root, config, render: true });
    const html = view(page, "gallery");
    expect(html).toContain("<h2>Gallery</h2>");
    expect(html).toContain('src="img/reference-home.png"');
    expect(html).toContain("no render command configured");
  });

  it("a live rebuild keeps the gallery and refreshes approvals from the data file", () => {
    const { config } = loadConfig(root);
    const first = buildPage({ root, config, render: false });
    put("docs/progress.json", '{"milestones":{},"images":{"home":{"approved":false}}}');
    const again = buildPage({ root, config, render: false, keepGallery: first.gallery });
    expect(again.gallery).toEqual([{ ...first.gallery[0], approved: false }]);
  });

  it("an explicit missing config is an error", () => {
    expect(() => loadConfig(root, join(root, "nope.json"))).toThrow(/config not found/);
  });

  it("reads the config from a specpulse key in package.json when there is no config file", () => {
    const other = mkdtempSync(join(tmpdir(), "specpulse-pkg-"));
    writeFileSync(join(other, "package.json"), '{"name":"pkg","specpulse":{"roadmap":"ROADMAP.md"}}');
    const { config, path } = loadConfig(other);
    expect(config.roadmap).toBe("ROADMAP.md");
    expect(path).toBe(`${join(other, "package.json")}#specpulse`);
    rmSync(other, { recursive: true, force: true });
  });
});

describe("client script", () => {
  it("bundles the real client modules into valid JavaScript without module syntax", () => {
    const js = clientScript();
    expect(() => new Function(js)).not.toThrow();
    expect(js).not.toMatch(/^s*(import|export)s/m);
    expect(js).toContain("boot();");
  });
});

describe("renderCommand", () => {
  it("fills placeholders, quoting paths", () => {
    expect(renderCommand("r {scene} -o {out} # {name}", "a b/x.scene", "/o/x.png", "x")).toBe(
      'r "a b/x.scene" -o "/o/x.png" # x',
    );
  });
});
