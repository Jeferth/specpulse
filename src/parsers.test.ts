import { describe, expect, it } from "vitest";
import { parseArgs } from "./args.ts";
import { defaultConfig, parseConfig, phasePath } from "./config.ts";
import { parseDataFile } from "./data-file.ts";
import { commitsFor, GIT_LOG_FORMAT, isClean, parseGitLog } from "./git-log.ts";
import { parseMilestones, parseRoadmap } from "./roadmap.ts";
import { isSpecFile, parseSpec } from "./spec.ts";

const ID = "F-\\d{4}";

describe("parseRoadmap", () => {
  it("reads phase rows (numeric link in the first cell) and strips bold from the name", () => {
    const md = [
      "| Phase | Name | How to test | Focus |",
      "|---|---|---|---|",
      "| [0](phase-0/README.md) | Foundation | `pnpm make op …` | Code factory |",
      "| [1](other/place.md) | **Agent generates** | In Claude Code | Layout |",
      "| 1 | RF-FS-01 (partial) |",
    ].join("\n");
    expect(parseRoadmap(md)).toEqual([
      { n: 0, name: "Foundation", test: "`pnpm make op …`", focus: "Code factory" },
      { n: 1, name: "Agent generates", test: "In Claude Code", focus: "Layout" },
    ]);
  });
});

describe("parseMilestones", () => {
  it("reads rows shaped | **N.M Name** | delivery |", () => {
    const md = [
      "| Milestone | Delivery | Parts |",
      "| **1.2 Layout + PNG** | `render` writes a PNG | `layout` |",
      "| **0.1 Repo base** | git, pnpm | ADR-07 | P |",
      "| Spike | When |",
    ].join("\r\n");
    expect(parseMilestones(md)).toEqual([
      { id: "1.2", name: "Layout + PNG", delivery: "`render` writes a PNG" },
      { id: "0.1", name: "Repo base", delivery: "git, pnpm" },
    ]);
  });
});

describe("parseSpec", () => {
  const md = ["# F-0008 · render and goldens", "", "- [x] one", "- [ ] two", "  - [X] three", "- item"];

  it("counts checked boxes and the total", () => {
    expect(parseSpec(md.join("\n"), "docs/specs/F-0008-x.md", ID)).toEqual({
      id: "F-0008",
      title: "render and goldens",
      file: "docs/specs/F-0008-x.md",
      done: 2,
      total: 3,
    });
  });

  it("ignores files without an ID heading and honours the configured pattern", () => {
    expect(parseSpec("# Something else\n- [x] a", "x.md", ID)).toBeUndefined();
    expect(parseSpec("# S-012: Navbar\n- [ ] a", "S-012.md", "S-\\d{3}")).toMatchObject({
      id: "S-012",
      title: "Navbar",
      total: 1,
    });
  });

  it("isSpecFile needs the ID prefix and .md", () => {
    expect(isSpecFile("F-0001-types.md", ID)).toBe(true);
    expect(isSpecFile("README.md", ID)).toBe(false);
    expect(isSpecFile("F-0001.txt", ID)).toBe(false);
  });
});

describe("git", () => {
  const log = [
    "cfd66c7\x1f2026-10-26T23:08:00-03:00\x1ffeat(maker): ✨ golden maker (F-0008)\x1f\x1e",
    "\nabc1234\x1f2026-10-25T10:00:00-03:00\x1fdocs: ✏️ x\x1fbody cites F-0007 and F-0007\n\x1e\n",
  ].join("");

  it("the format has the separators the parser expects", () => {
    expect(GIT_LOG_FORMAT).toContain("%x1f");
    expect(GIT_LOG_FORMAT).toContain("%x1e");
  });

  it("parseGitLog extracts IDs from subject and body, without repeats", () => {
    const commits = parseGitLog(log, ID);
    expect(commits.map((c) => [c.hash, c.specs])).toEqual([
      ["cfd66c7", ["F-0008"]],
      ["abc1234", ["F-0007"]],
    ]);
    expect(commitsFor("F-0007", commits).map((c) => c.hash)).toEqual(["abc1234"]);
  });

  it("isClean reads status --porcelain output", () => {
    expect(isClean("\n")).toBe(true);
    expect(isClean(" M package.json\n")).toBe(false);
  });
});

describe("parseDataFile", () => {
  it("accepts the Portuguese format (marcos/goldens/fonte/nota/aprovada)", () => {
    const p = parseDataFile(
      JSON.stringify({
        $comment: "x",
        marcos: { "0.1": { status: "feito", fonte: "x" }, "1.2": { specs: ["F-0005"], nota: "n" } },
        goldens: { "card-tokens": { aprovada: false } },
      }),
      "docs/progresso.json",
    );
    expect(p.milestones["0.1"]).toEqual({ status: "done", source: "x" });
    expect(p.milestones["1.2"]).toEqual({ specs: ["F-0005"], note: "n" });
    expect(p.images["card-tokens"]).toEqual({ approved: false });
  });

  it("accepts the English format", () => {
    const p = parseDataFile(
      '{"milestones":{"2.1":{"status":"in progress","note":"n"}},"images":{"a":{"approved":true}}}',
      "p.json",
    );
    expect(p.milestones["2.1"]).toEqual({ status: "doing", note: "n" });
    expect(p.images["a"]).toEqual({ approved: true });
  });

  it("rejects unknown status and images without approved, naming the file and field", () => {
    expect(() => parseDataFile('{"marcos":{"1.1":{"status":"almost"}}}', "p.json")).toThrow(
      /p\.json: marcos\.1\.1\.status/,
    );
    expect(() => parseDataFile('{"goldens":{"a":{}}}', "p.json")).toThrow(/goldens\.a\.approved/);
    expect(() => parseDataFile("[]", "p.json")).toThrow(/JSON object/);
  });
});

describe("config", () => {
  it("an empty config is the defaults", () => {
    expect(parseConfig({}, "demo", "c.json")).toEqual(defaultConfig("demo"));
  });

  it("reads every field and fills nested defaults", () => {
    const c = parseConfig(
      {
        title: "X",
        locale: "pt-BR",
        phaseFile: "docs/fase-{n}/README.md",
        specs: { idPattern: "F-\\d{4}" },
        gallery: { dir: "tests/golden", sceneExt: ".scene", render: "r {scene} {out}" },
      },
      "demo",
      "c.json",
    );
    expect(c).toMatchObject({ title: "X", locale: "pt-BR", outDir: ".cache/specpulse" });
    expect(c.specs).toEqual({ dir: "docs/specs", idPattern: "F-\\d{4}", format: "markdown" });
    expect(c.gallery).toEqual({
      dir: "tests/golden",
      referenceExt: ".png",
      sceneExt: ".scene",
      render: "r {scene} {out}",
    });
    expect(phasePath(c, 3)).toBe("docs/fase-3/README.md");
  });

  it("rejects typos, bad types and invalid patterns with the path", () => {
    expect(() => parseConfig({ titel: "x" }, "d", "c.json")).toThrow(/c\.json: unknown key "titel"/);
    expect(() => parseConfig({ locale: "fr" }, "d", "c.json")).toThrow(/locale/);
    expect(() => parseConfig({ specs: { idPattern: "(" } }, "d", "c.json")).toThrow(/idPattern/);
    expect(() => parseConfig({ gallery: {} }, "d", "c.json")).toThrow(/"dir"/);
    expect(() => parseConfig({ timelineLimit: 0 }, "d", "c.json")).toThrow(/timelineLimit/);
  });
});

describe("parseArgs", () => {
  it("reads flags, values and the port", () => {
    expect(
      parseArgs([
        "--open",
        "--serve",
        "--port",
        "5000",
        "--no-render",
        "--cwd",
        "../app",
        "--config",
        "x.json",
      ]),
    ).toEqual({
      open: true,
      serve: true,
      port: 5000,
      render: false,
      help: false,
      version: false,
      cwd: "../app",
      config: "x.json",
    });
    expect(parseArgs([]).render).toBe(true);
    expect(parseArgs(["-h"]).help).toBe(true);
  });

  it("rejects bad ports, missing values and unknown options", () => {
    expect(() => parseArgs(["--port", "abc"])).toThrow(/--port/);
    expect(() => parseArgs(["--cwd"])).toThrow(/--cwd needs a value/);
    expect(() => parseArgs(["--bogus"])).toThrow(/unknown option/);
  });
});

describe("config: live and spec formats", () => {
  it("reads live options and spec format fields", () => {
    const c = parseConfig(
      {
        locale: "es",
        specs: { format: "auto", acceptanceHeading: "Acceptance", idFrom: "filename" },
        live: { check: "pnpm -s check", checkOnChange: true, claudeSessions: true, commits: 5 },
      },
      "d",
      "c.json",
    );
    expect(c.locale).toBe("es");
    expect(c.specs).toMatchObject({ format: "auto", acceptanceHeading: "Acceptance", idFrom: "filename" });
    expect(c.live).toEqual({ check: "pnpm -s check", checkOnChange: true, claudeSessions: true, commits: 5 });
  });

  it("rejects bad live and spec format values", () => {
    expect(() => parseConfig({ specs: { format: "yaml" } }, "d", "c.json")).toThrow(/format/);
    expect(() => parseConfig({ live: { checkOnChange: "yes" } }, "d", "c.json")).toThrow(/checkOnChange/);
    expect(() => parseConfig({ live: { nope: 1 } }, "d", "c.json")).toThrow(/unknown key "nope"/);
  });
});
