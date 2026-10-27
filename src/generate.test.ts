import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { generate } from "./generate.ts";
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

describe("generate", () => {
  it("works with defaults and no git, titled after package.json", () => {
    const { config } = loadConfig(root);
    const { index } = generate({ root, config, render: true, now: new Date(2026, 9, 27, 13, 0, 0) });
    const html = readFileSync(index, "utf8");
    expect(index).toBe(join(root, ".cache/specpulse/index.html"));
    expect(html).toContain("<title>demo-app · progress</title>");
    expect(html).toContain("acceptance checkboxes of APP-001 (1/2)");
    expect(html).toContain("1/2 milestones · 75%");
    expect(html).toContain("generated at 2026-10-27 13:00:00");
    expect(html).not.toContain("<h2>Gallery</h2>");
  });

  it("reads specpulse.config.json, copies references and explains the missing render", () => {
    put("specpulse.config.json", '{"title":"Demo","gallery":{"dir":"gallery"},"outDir":"out"}');
    const { config, path } = loadConfig(root);
    expect(path).toBe(join(root, "specpulse.config.json"));
    const html = readFileSync(generate({ root, config, render: true }).index, "utf8");
    expect(html).toContain("<h2>Gallery</h2>");
    expect(html).toContain('src="img/reference-home.png"');
    expect(html).toContain("no render command configured");
  });

  it("an explicit missing config is an error", () => {
    expect(() => loadConfig(root, join(root, "nope.json"))).toThrow(/config not found/);
  });
});

describe("renderCommand", () => {
  it("fills placeholders, quoting paths", () => {
    expect(renderCommand("r {scene} -o {out} # {name}", "a b/x.scene", "/o/x.png", "x")).toBe(
      'r "a b/x.scene" -o "/o/x.png" # x',
    );
  });
});
