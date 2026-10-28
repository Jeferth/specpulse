// Shared test fixtures (not part of the build).
import type { Commit } from "../git-log.ts";
import type { ModelInput } from "../model.ts";
import type { Criterion } from "../spec.ts";

/** Checkbox list with the given states, texts "c1", "c2", … */
export const criteria = (states: readonly boolean[]): Criterion[] =>
  states.map((done, i) => ({ text: `c${i + 1}`, done }));

export const commit: Commit = {
  hash: "abc1234",
  date: "2026-10-26T23:00:00-03:00",
  subject: "feat: x (F-0002)",
  specs: ["F-0002"],
};

export const input: ModelInput = {
  phases: [
    { n: 0, name: "Foundation", test: "", focus: "Factory" },
    { n: 1, name: "Agent", test: "", focus: "AI" },
    { n: 2, name: "Viewer", test: "", focus: "See" },
  ],
  milestones: new Map([
    [0, [{ id: "0.1", name: "Repo", delivery: "git" }]],
    [
      1,
      [
        { id: "1.1", name: "Document", delivery: "`new`" },
        { id: "1.2", name: "Layout", delivery: "render" },
      ],
    ],
  ]),
  specs: [
    { id: "F-0002", title: "Op", file: "f2.md", done: 3, total: 3, criteria: criteria([true, true, true]) },
    {
      id: "F-0001",
      title: "Types",
      file: "f1.md",
      done: 0,
      total: 3,
      criteria: criteria([false, false, false]),
    },
  ],
  commits: [commit],
  data: {
    milestones: {
      "0.1": { status: "done", source: "README" },
      "1.1": { specs: ["F-0001", "F-0002"], note: "note" },
    },
    images: {},
  },
  dataFile: "docs/progress.json",
  phaseFile: (n) => `docs/phase-${n}/README.md`,
};
