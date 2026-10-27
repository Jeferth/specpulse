import { describe, expect, it } from "vitest";
import { buildModel, statusOf } from "./model.ts";
import { commit, input } from "./testing/fixtures.ts";
import { buildTimeline, readableStamp, stampOf } from "./timeline.ts";

describe("buildModel", () => {
  const model = buildModel(input);
  const [f0, f1, f2] = model.phases;

  it("manual status says it came from the data file and from which source", () => {
    expect(f0?.status).toBe("done");
    expect(f0?.milestones[0]?.source).toEqual({
      kind: "manual",
      file: "docs/progress.json",
      detail: "README",
    });
  });

  it("a milestone with specs derives from the checkboxes (3/6 = doing)", () => {
    const m = f1?.milestones[0];
    expect(m?.status).toBe("doing");
    expect(m?.progress).toBe(0.5);
    expect(m?.source).toEqual({ kind: "specs", ids: ["F-0001", "F-0002"], done: 3, total: 6 });
    expect(m?.note).toBe("note");
  });

  it("a milestone without data is todo; a phase averages its milestones", () => {
    expect(f1?.milestones[1]).toMatchObject({ status: "todo", source: { kind: "none" } });
    expect(f1?.progress).toBe(0.25);
    expect(f1?.status).toBe("doing");
    expect(f2).toMatchObject({ status: "todo", progress: 0, milestones: [], file: "docs/phase-2/README.md" });
  });

  it("a cited spec that does not exist counts as one open criterion", () => {
    const m = buildModel({ ...input, data: { milestones: { "1.2": { specs: ["F-0099"] } }, images: {} } });
    expect(m.phases[1]?.milestones[1]?.source).toMatchObject({ done: 0, total: 1 });
  });

  it("specs sorted, with milestone, commits and date of the last commit", () => {
    expect(model.specs.map((s) => s.id)).toEqual(["F-0001", "F-0002"]);
    expect(model.specs[1]).toMatchObject({ milestone: "1.1", lastDate: commit.date });
    expect(model.specs[1]?.commits).toHaveLength(1);
    expect(model.specs[0]?.lastDate).toBeUndefined();
  });

  it("statusOf", () => {
    expect([statusOf(0), statusOf(0.1), statusOf(1)]).toEqual(["todo", "doing", "done"]);
  });
});

describe("timeline", () => {
  it("stampOf sorts as text and readableStamp formats it", () => {
    expect(stampOf(new Date(2026, 9, 7, 3, 4, 5))).toBe("2026-10-07_03-04-05");
    expect(readableStamp("2026-10-07_03-04-05")).toBe("2026-10-07 03:04:05");
  });

  it("newest first, marking new/changed/same against the previous snapshot", () => {
    const img = (name: string, hash: string) => ({ name, src: `${name}.png`, hash });
    const t = buildTimeline(
      [
        { stamp: "2026-10-01_10-00-00", images: [img("a", "1")] },
        { stamp: "2026-10-03_10-00-00", images: [img("a", "2"), img("b", "9")] },
        { stamp: "2026-10-02_10-00-00", images: [img("a", "1")] },
      ],
      2,
    );
    expect(t.map((s) => s.stamp)).toEqual(["2026-10-03_10-00-00", "2026-10-02_10-00-00"]);
    expect(t[0]?.images.map((i) => i.change)).toEqual(["changed", "new"]);
    expect(t[1]?.images.map((i) => i.change)).toEqual(["same"]);
  });
});
