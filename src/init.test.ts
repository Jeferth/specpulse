import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { initProject } from "./commands/init.ts";
import { defaultConfig, parseConfig } from "./config.ts";
import {
  configDiff,
  configFileText,
  configFromDetection,
  detectLayout,
  emptyDataFileText,
  inferIdPattern,
  inferSpecFormat,
  isIgnored,
  schemaRef,
} from "./init.ts";

const DEFAULT_TREE = [
  "package.json",
  "docs/roadmap.md",
  "docs/phase-1/README.md",
  "docs/phase-2/README.md",
  "docs/phase-2/notes.md",
  "docs/progress.json",
  "docs/specs/APP-001-parser.md",
  "docs/specs/APP-002-cli.md",
  "docs/specs/README.md",
];

const DRAFTLY_TREE = [
  "docs/roadmap.md",
  "docs/fase-1/README.md",
  "docs/fase-2/README.md",
  "docs/fase-3/README.md",
  "docs/specs/README.md",
  "docs/specs/features/F-0001-canvas.md",
  "docs/specs/features/F-0002-export.md",
  "docs/progresso.json",
  "tests/golden/home.png",
];

describe("detectLayout", () => {
  it("finds the default layout", () => {
    const d = detectLayout({ paths: DEFAULT_TREE });
    expect(d).toEqual({
      roadmap: "docs/roadmap.md",
      phaseFile: "docs/phase-{n}/README.md",
      specsDir: "docs/specs",
      specFiles: ["docs/specs/APP-001-parser.md", "docs/specs/APP-002-cli.md"],
      idPattern: "APP-\\d{3}",
      dataFile: "docs/progress.json",
    });
  });

  it("finds a Portuguese layout with nested spec folder and four-digit IDs", () => {
    const d = detectLayout({ paths: DRAFTLY_TREE });
    expect(d.phaseFile).toBe("docs/fase-{n}/README.md");
    expect(d.specsDir).toBe("docs/specs/features");
    expect(d.idPattern).toBe("F-\\d{4}");
    expect(d.dataFile).toBe("docs/progresso.json");
    expect(d.locale).toBe("pt-BR");
  });

  it("finds nothing in an empty project", () => {
    expect(detectLayout({ paths: [] })).toEqual({ specFiles: [] });
    expect(detectLayout({ paths: ["package.json", "src/index.ts"] })).toEqual({ specFiles: [] });
  });

  it("knows other roadmap and phase spellings", () => {
    const d = detectLayout({
      paths: ["ROADMAP.md", "phases/1/README.md", "phases/2/README.md", "specs/x-notes.md"],
    });
    expect(d.roadmap).toBe("ROADMAP.md");
    expect(d.phaseFile).toBe("phases/{n}/README.md");
    expect(d.specsDir).toBe("specs");
    expect(d.idPattern).toBeUndefined();
  });

  it("detects frontmatter specs from file heads", () => {
    const paths = ["specs/S-001-a.md", "specs/S-002-b.md"];
    const all = { "specs/S-001-a.md": "---\nid: S-001\n", "specs/S-002-b.md": "---\r\nid: S-002\n" };
    expect(detectLayout({ paths, heads: all }).specFormat).toBe("frontmatter");
    const mixed = { ...all, "specs/S-002-b.md": "# S-002 · B\n" };
    expect(detectLayout({ paths, heads: mixed }).specFormat).toBe("auto");
    expect(detectLayout({ paths }).specFormat).toBeUndefined();
  });
});

describe("inferIdPattern / inferSpecFormat", () => {
  it("generalises over prefixes and widths", () => {
    expect(inferIdPattern(["APP-1-a.md", "APP-12-b.md"])).toBe("APP-\\d{1,}");
    expect(inferIdPattern(["APP-001.md", "LIB-0002.md"])).toBe("[A-Z]+-\\d{3,}");
    expect(inferIdPattern(["readme.md"])).toBeUndefined();
  });

  it("returns undefined without frontmatter", () => {
    expect(inferSpecFormat(["a.md"], { "a.md": "# A" })).toBeUndefined();
  });
});

describe("config diff", () => {
  it("writes nothing but $schema for the defaults", () => {
    const c = defaultConfig("app");
    expect(configDiff(c, "app")).toEqual({});
    expect(JSON.parse(configFileText(c, "app"))).toEqual({
      $schema: "./node_modules/specpulse/schema/config.schema.json",
    });
  });

  it("keeps only the non-default fields, title left out", () => {
    const c = configFromDetection(detectLayout({ paths: DRAFTLY_TREE }), "draft");
    expect(configDiff(c, "draft")).toEqual({
      locale: "pt-BR",
      dataFile: "docs/progresso.json",
      phaseFile: "docs/fase-{n}/README.md",
      specs: { dir: "docs/specs/features", idPattern: "F-\\d{4}" },
    });
    // The written file round-trips through the real parser to the same config.
    expect(parseConfig(JSON.parse(configFileText(c, "draft")), "draft", "test")).toEqual(c);
  });

  it("an explicit locale wins and places a missing data file", () => {
    const c = configFromDetection(detectLayout({ paths: [] }), "x", "es");
    expect(configDiff(c, "x")).toEqual({ locale: "es", dataFile: "docs/progreso.json" });
    const en = configFromDetection(detectLayout({ paths: DRAFTLY_TREE }), "x", "en");
    expect(en.locale).toBe("en");
    expect(en.dataFile).toBe("docs/progresso.json");
  });

  it("points $schema into node_modules relative to each file", () => {
    expect(schemaRef("progress.json", "data")).toBe("./node_modules/specpulse/schema/data.schema.json");
    expect(schemaRef("docs/a/progress.json", "data")).toBe(
      "../../node_modules/specpulse/schema/data.schema.json",
    );
    expect(JSON.parse(emptyDataFileText("docs/progress.json"))).toEqual({
      $schema: "../node_modules/specpulse/schema/data.schema.json",
      milestones: {},
      images: {},
    });
  });
});

describe("isIgnored", () => {
  it("matches the folder or a parent, in the usual spellings", () => {
    expect(isIgnored("node_modules/\n.cache/\n", ".cache/specpulse")).toBe(true);
    expect(isIgnored("/.cache", ".cache/specpulse")).toBe(true);
    expect(isIgnored("**/.cache/specpulse/**", ".cache/specpulse")).toBe(true);
    expect(isIgnored("# .cache\n.cachex\n", ".cache/specpulse")).toBe(false);
    expect(isIgnored("", ".cache/specpulse")).toBe(false);
  });
});

describe("initProject (disk)", () => {
  const roots: string[] = [];
  afterAll(() => {
    for (const r of roots) rmSync(r, { recursive: true, force: true });
  });
  const project = (files: Record<string, string>): string => {
    const root = mkdtempSync(join(tmpdir(), "specpulse-init-"));
    roots.push(root);
    for (const [rel, text] of Object.entries(files)) {
      mkdirSync(dirname(join(root, rel)), { recursive: true });
      writeFileSync(join(root, rel), text);
    }
    return root;
  };

  it("writes config and data file in a fresh Portuguese project", () => {
    const root = project(
      Object.fromEntries([
        ...DRAFTLY_TREE.filter((p) => !p.endsWith(".json")).map((p) => [p, "# x\n"]),
        [".gitignore", "node_modules\n"],
      ]),
    );
    const r = initProject(root);
    expect(r.created).toEqual(["specpulse.config.json", "docs/progresso.json"]);
    expect(r.skipped).toEqual([]);
    expect(r.outDirIgnored).toBe(false);
    const cfg = JSON.parse(readFileSync(join(root, "specpulse.config.json"), "utf8"));
    expect(cfg.specs).toEqual({ dir: "docs/specs/features", idPattern: "F-\\d{4}" });
    const data = JSON.parse(readFileSync(join(root, "docs/progresso.json"), "utf8"));
    expect(data).toMatchObject({ milestones: {}, images: {} });
  });

  it("never overwrites an existing config or data file", () => {
    const config = '{ "dataFile": "state.json", "outDir": "out" }';
    const state = '{ "milestones": { "1.1": { "status": "done" } } }';
    const root = project({ ".specpulse.json": config, "state.json": state, ".gitignore": "/out/\n" });
    const r = initProject(root, { locale: "pt-BR" });
    expect(r.created).toEqual([]);
    expect(r.skipped).toEqual([".specpulse.json", "state.json"]);
    expect(r.outDirIgnored).toBe(true);
    expect(readFileSync(join(root, ".specpulse.json"), "utf8")).toBe(config);
    expect(readFileSync(join(root, "state.json"), "utf8")).toBe(state);
  });

  it("keeps an existing data file even when it writes the config", () => {
    const state = '{ "marcos": {} }';
    const root = project({ "docs/progress.json": state });
    const r = initProject(root);
    expect(r.created).toEqual(["specpulse.config.json"]);
    expect(r.skipped).toEqual(["docs/progress.json"]);
    expect(readFileSync(join(root, "docs/progress.json"), "utf8")).toBe(state);
  });
});
