import { describe, expect, it } from "vitest";
import { updateDataFile } from "./data-edit.ts";
import { parseDataFile } from "./data-file.ts";

const fmt = (v: unknown): string => `${JSON.stringify(v, null, 2)}\n`;

const EN = {
  $schema: "./schema/data.schema.json",
  $comment: "kept by the owner",
  milestones: {
    "1.1": { specs: ["APP-001"], note: "parser" },
    "1.2": { status: "doing", source: "README" },
    "2.1": { custom: 1 },
  },
  images: { hero: { approved: true, note: "ok" } },
};

const PT = {
  $comment: "mantido pelo dono",
  marcos: {
    "0.1": { status: "feito", fonte: "README", nota: "base" },
    "1.1": { specs: ["F-0001"] },
  },
  goldens: { capa: { aprovada: true } },
};

describe("updateDataFile round-trip", () => {
  it("English: changes only the edited field", () => {
    const out = updateDataFile(
      fmt(EN),
      { milestone: "1.2", status: "done", source: "demo video" },
      "progress.json",
    );
    const expected = structuredClone(EN);
    expected.milestones["1.2"] = { status: "done", source: "demo video" };
    expect(out).toBe(fmt(expected));
  });

  it("Portuguese: keeps Portuguese keys and status words", () => {
    const out = updateDataFile(
      fmt(PT),
      { milestone: "0.1", status: "in progress", source: "README §2", note: "revisar" },
      "progresso.json",
    );
    const expected = structuredClone(PT);
    expected.marcos["0.1"] = { status: "em andamento", fonte: "README §2", nota: "revisar" };
    expect(out).toBe(fmt(expected));
    expect(parseDataFile(out, "x").milestones["0.1"]?.status).toBe("doing");
  });

  it("Portuguese: new entries and images use Portuguese keys", () => {
    const out = updateDataFile(fmt(PT), { image: "capa", approved: false, note: "regrediu" }, "p");
    const expected = structuredClone(PT) as Record<string, unknown>;
    expected["goldens"] = { capa: { aprovada: false, nota: "regrediu" } };
    expect(out).toBe(fmt(expected));
    const added = JSON.parse(updateDataFile(fmt(PT), { milestone: "1.2", specs: ["F-0002"] }, "p"));
    expect(Object.keys(added.marcos)).toEqual(["0.1", "1.1", "1.2"]);
    expect(added.marcos["1.2"]).toEqual({ specs: ["F-0002"] });
  });

  it("sets specs and notes, removes fields with null / [] and keeps CRLF", () => {
    const crlf = fmt(EN).replaceAll("\n", "\r\n");
    const out = updateDataFile(crlf, { milestone: "1.1", specs: ["APP-001", "APP-003"], note: null }, "p");
    expect(out).toContain("\r\n");
    expect(JSON.parse(out).milestones["1.1"]).toEqual({ specs: ["APP-001", "APP-003"] });
    const cleared = JSON.parse(updateDataFile(fmt(EN), { milestone: "1.2", status: null }, "p"));
    expect(cleared.milestones["1.2"]).toEqual({});
  });

  it("creates a missing file with English keys", () => {
    const out = updateDataFile(undefined, { milestone: "1.1", specs: ["APP-001"] }, "p");
    expect(out).toBe(fmt({ milestones: { "1.1": { specs: ["APP-001"] } }, images: {} }));
  });
});

describe("updateDataFile refusals", () => {
  it("refuses to approve an image", () => {
    expect(() => updateDataFile(fmt(EN), { image: "hero", approved: true }, "p")).toThrow(/owner's decision/);
  });

  it("refuses a manual status without a source", () => {
    expect(() => updateDataFile(fmt(EN), { milestone: "1.2", status: "done" }, "p")).toThrow(
      /needs `source`/,
    );
    expect(() => updateDataFile(fmt(EN), { milestone: "1.2", status: "done", source: " " }, "p")).toThrow(
      /needs `source`/,
    );
  });

  it("refuses a manual status on a milestone made of specs", () => {
    expect(() => updateDataFile(fmt(EN), { milestone: "1.1", status: "done", source: "x" }, "p")).toThrow(
      /made of specs/,
    );
    const ok = updateDataFile(fmt(EN), { milestone: "1.1", status: "done", source: "x", specs: [] }, "p");
    expect(JSON.parse(ok).milestones["1.1"]).toEqual({ note: "parser", status: "done", source: "x" });
  });

  it("refuses bad statuses, empty changes and an already invalid file", () => {
    expect(() => updateDataFile(fmt(EN), { milestone: "1.2", status: "finished", source: "x" }, "p")).toThrow(
      /not valid/,
    );
    expect(() => updateDataFile(fmt(EN), { milestone: "1.2" }, "p")).toThrow(/nothing to change/);
    expect(() =>
      updateDataFile(
        fmt({ milestones: { "1.1": { status: "nope" } } }),
        { milestone: "1.1", note: "x" },
        "p",
      ),
    ).toThrow(/p: milestones.1.1.status/);
  });
});
