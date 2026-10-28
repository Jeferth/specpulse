import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadConfig } from "./io/load-config.ts";
import { readModelInput } from "./io/repo.ts";
import { buildModel } from "./model.ts";
import { buildSummary, summaryText } from "./summary.ts";
import { input } from "./testing/fixtures.ts";

const basicModel = () => {
  const root = join(import.meta.dirname, "../examples/basic");
  const { config } = loadConfig(root);
  // No commits: the snapshot must not depend on this repository's history.
  return buildModel(readModelInput(root, config, []));
};

describe("summaryText", () => {
  it("summarises examples/basic", () => {
    expect(summaryText(basicModel())).toMatchInlineSnapshot(`
      "Current phase: 1 Core

      Phase 1 Core: doing 33%
        - 1.1 Parser: doing 67% | specs APP-001 (2/3 criteria)
        - 1.2 CLI: todo 0% | specs APP-002 (0/2 criteria) | note: waiting for the parser
      Phase 2 Editor: todo 0%
        - 2.1 Canvas: todo 0% | no entry in docs/progress.json

      Open specs:
      - APP-001 Parser: 1 of 3 criteria open | milestone 1.1 | docs/specs/APP-001-parser.md
      - APP-002 CLI: 2 of 2 criteria open | milestone 1.2 | docs/specs/APP-002-cli.md
      "
    `);
  });

  it("filters by phase and by spec", () => {
    const model = buildModel(input);
    const s = buildSummary(model, { phase: 0, spec: "F-0002" });
    expect(s.phases.map((p) => p.n)).toEqual([0]);
    expect(s.openSpecs.map((x) => x.id)).toEqual(["F-0002"]);
    expect(s.currentPhase).toEqual({ n: 1, name: "Agent" });
  });

  it("shows a manual status with its source and handles an empty roadmap", () => {
    const text = summaryText(buildModel(input));
    expect(text).toContain("0.1 Repo: done 100% | manual (docs/progress.json: README)");
    expect(summaryText(buildModel({ ...input, phases: [], specs: [], milestones: new Map() }))).toBe(
      "Current phase: none (no phases in the roadmap)\n\nOpen specs: none\n",
    );
  });
});
