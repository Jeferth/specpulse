import { describe, expect, it } from "vitest";
import { escapeHtml, inlineMd, type Page, renderHtml } from "./html.ts";
import { stringsFor } from "./i18n.ts";
import { buildModel } from "./model.ts";
import { commit, input } from "./testing/fixtures.ts";

const page = (over: Partial<Page> = {}): Page => ({
  meta: {
    title: "Demo",
    inputs: ["docs/roadmap.md", "docs/progress.json"],
    specsDir: "docs/specs",
    gallery: { dir: "tests/golden", renderCommand: true, historyDir: ".cache/specpulse/history" },
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

describe("html", () => {
  it("escapes text and converts one-line markdown", () => {
    expect(escapeHtml(`<a href="x">&'`)).toBe("&#60;a href=&#34;x&#34;&#62;&#38;&#39;");
    expect(inlineMd("**1.1** `new` [guide](a.md) <b>")).toBe(
      "<strong>1.1</strong> <code>new</code> guide &#60;b&#62;",
    );
  });

  it("is self-contained and shows badge, source and footer (en)", () => {
    const html = renderHtml(page(), stringsFor("en"));
    expect(html).toContain("<title>Demo · progress</title>");
    expect(html).toContain("awaiting owner approval");
    expect(html).toContain("render skipped (--no-render)");
    expect(html).toContain("manual in docs/progress.json · README");
    expect(html).toContain("has changes");
    expect(html).toContain("<b>main</b>");
    expect(html).not.toMatch(/<(script|link)[^>]+(src|href)="https?:/);
  });

  it("speaks Portuguese with locale pt-BR", () => {
    const html = renderHtml(page(), stringsFor("pt-BR"));
    expect(html).toContain('lang="pt-BR"');
    expect(html).toContain("aguardando aprovação do dono");
    expect(html).toContain("checkboxes de aceite de F-0001, F-0002 (3/6)");
    expect(html).toContain("em andamento");
  });

  it("hides gallery and timeline when no gallery is configured", () => {
    const p = page();
    const meta = { title: p.meta.title, inputs: p.meta.inputs, specsDir: p.meta.specsDir };
    const html = renderHtml({ ...p, meta }, stringsFor("en"));
    expect(html).not.toContain("<h2>Gallery</h2>");
    expect(html).not.toContain("images awaiting approval");
  });

  it("explains a missing render when no render command is configured", () => {
    const p = page();
    const meta = { ...p.meta, gallery: { dir: "img", renderCommand: false, historyDir: "h" } };
    expect(renderHtml({ ...p, meta }, stringsFor("en"))).toContain("no render command configured");
  });
});
