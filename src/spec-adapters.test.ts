import { describe, expect, it } from "vitest";
import type { SpecsConfig } from "./config.ts";
import { parseFrontmatter } from "./frontmatter.ts";
import { criteriaOf, titleOf } from "./spec.ts";
import { adapterFor, isSpecCandidate, readSpec, SPEC_ADAPTERS } from "./spec-adapters.ts";
import { statusFromText } from "./spec-frontmatter.ts";

const md: SpecsConfig = { dir: "docs/specs", idPattern: "S-\\d{3}", format: "markdown" };
const fm: SpecsConfig = { ...md, format: "frontmatter" };
const auto: SpecsConfig = { ...md, format: "auto" };

describe("parseFrontmatter", () => {
  it("reads scalars, quoted strings, comments and both list styles", () => {
    const r = parseFrontmatter(
      [
        "---",
        "id: S-001",
        'title: "Login: the \\"fast\\" path"',
        "note: 'it''s fine'",
        "status: doing # still open",
        "tags: [a, 'b, c', d]",
        "# a comment line",
        "owners:",
        "  - ana",
        "  - 'bo'",
        "empty:",
        "---",
        "# body",
      ].join("\n"),
    );
    expect(r?.data).toEqual({
      id: "S-001",
      title: 'Login: the "fast" path',
      note: "it's fine",
      status: "doing",
      tags: ["a", "b, c", "d"],
      owners: ["ana", "bo"],
      empty: "",
    });
    expect(r?.body).toBe("# body");
    expect(r?.errors).toEqual([]);
  });

  it("no block, or a block never closed, is not frontmatter", () => {
    expect(parseFrontmatter("# S-001 · x")).toBeUndefined();
    expect(parseFrontmatter("---\nid: S-001\n# S-001 · x")).toBeUndefined();
  });

  it("bad lines are reported and skipped, not thrown", () => {
    const r = parseFrontmatter("---\r\nid: S-002\r\njust words\r\n  nested: map\r\n---\r\n");
    expect(r?.data).toEqual({ id: "S-002" });
    expect(r?.errors).toEqual(['line 3: expected "key: value"', 'line 4: expected "key: value"']);
  });
});

describe("criteriaOf and acceptanceHeading", () => {
  const body = [
    "# S-001 · x",
    "- [x] outside",
    "## Acceptance criteria:",
    "- [x] one",
    "### Detail",
    "* [ ] two",
    "## Notes",
    "- [ ] not counted",
  ].join("\n");

  it("all checkboxes by default, with their text", () => {
    expect(criteriaOf(body).map((c) => c.text)).toEqual(["outside", "one", "two", "not counted"]);
  });

  it("only the named section (case and trailing colon ignored), subsections included", () => {
    expect(criteriaOf(body, "acceptance CRITERIA")).toEqual([
      { text: "one", done: true },
      { text: "two", done: false },
    ]);
  });

  it("a missing heading counts nothing", () => {
    expect(criteriaOf(body, "Critérios de aceite")).toEqual([]);
  });

  it("the markdown adapter applies it", () => {
    const s = readSpec(body, "docs/specs/S-001.md", { ...md, acceptanceHeading: "Acceptance criteria" });
    expect(s).toMatchObject({ id: "S-001", done: 1, total: 2 });
  });
});

describe("markdown adapter", () => {
  it("idFrom filename takes the ID from the file name and the title from the H1", () => {
    const s = readSpec("# Login screen\n- [ ] a", "docs/specs/S-004-login.md", { ...md, idFrom: "filename" });
    expect(s).toMatchObject({ id: "S-004", title: "Login screen", total: 1 });
    expect(readSpec("- [ ] a", "docs/specs/notes.md", { ...md, idFrom: "filename" })).toBeUndefined();
  });

  it("titleOf strips the ID prefix and falls back to the file name", () => {
    expect(titleOf("# S-004 · Login", "S-004-login.md", "S-004")).toBe("Login");
    expect(titleOf("no heading", "docs/specs/S-004-login-flow.md", "S-004")).toBe("login-flow");
  });

  it("idFrom frontmatter finds nothing in plain markdown", () => {
    expect(readSpec("# S-001 · x", "S-001.md", { ...md, idFrom: "frontmatter" })).toBeUndefined();
  });
});

describe("frontmatter adapter", () => {
  const file = "docs/specs/login.md";
  const head = (...lines: string[]) => ["---", ...lines, "---"].join("\n");

  it("reads id, title, status and milestone; checkboxes still count", () => {
    const s = readSpec(
      `${head("id: S-010", "title: Login", "status: In Progress", "milestone: 1.2")}\n- [x] a\n- [ ] b`,
      file,
      fm,
    );
    expect(s).toEqual({
      id: "S-010",
      title: "Login",
      file,
      done: 1,
      total: 2,
      criteria: [
        { text: "a", done: true },
        { text: "b", done: false },
      ],
      status: "doing",
      milestone: "1.2",
    });
  });

  it("without checkboxes, progress comes from the status (synthetic 2-point scale)", () => {
    const of = (status: string) => readSpec(`${head("id: S-011", `status: ${status}`)}\n# Text`, file, fm);
    expect(of("done")).toMatchObject({
      done: 2,
      total: 2,
      status: "done",
      progressFrom: "status",
      criteria: [],
    });
    expect(of("wip")).toMatchObject({ done: 1, total: 2, status: "doing" });
    expect(of("backlog")).toMatchObject({ done: 0, total: 2, status: "todo" });
    expect(of("a fazer")).toMatchObject({ status: "todo" });
  });

  it("an unknown status is ignored", () => {
    const s = readSpec(`${head("id: S-012", "status: someday")}\n`, file, fm);
    expect(s).toMatchObject({ id: "S-012", done: 0, total: 0 });
    expect(s?.status).toBeUndefined();
    expect(statusFromText(" Completed ")).toBe("done");
  });

  it("ID falls back to the heading, then the file name; title to the H1", () => {
    expect(readSpec(`${head("status: todo")}\n# S-013 · From heading`, file, fm)).toMatchObject({
      id: "S-013",
      title: "From heading",
    });
    expect(readSpec(`${head("status: todo")}\n# Login`, "docs/specs/S-014-login.md", fm)).toMatchObject({
      id: "S-014",
      title: "Login",
    });
    expect(readSpec(`${head("status: todo")}\n# Login`, file, fm)).toBeUndefined();
  });

  it("an explicit idFrom uses only that source", () => {
    const text = `${head("id: S-020")}\n# S-021 · Title`;
    expect(readSpec(text, "S-022-x.md", { ...fm, idFrom: "heading" })?.id).toBe("S-021");
    expect(readSpec(text, "S-022-x.md", { ...fm, idFrom: "filename" })?.id).toBe("S-022");
    expect(readSpec(text, "S-022-x.md", { ...fm, idFrom: "frontmatter" })?.id).toBe("S-020");
  });

  it("an unterminated block falls back to plain markdown", () => {
    const s = readSpec("---\nid: S-030\n# S-031 · Broken header\n- [x] a", file, fm);
    expect(s).toMatchObject({ id: "S-031", title: "Broken header", done: 1, total: 1 });
  });

  it("bad lines in the block are skipped and the rest is used", () => {
    const s = readSpec(`${head("id: S-032", "oops no colon", "status: done")}\n`, file, fm);
    expect(s).toMatchObject({ id: "S-032", status: "done" });
  });

  it("acceptanceHeading applies to the body", () => {
    const s = readSpec(`${head("id: S-033")}\n- [x] a\n## Acceptance\n- [ ] b`, file, {
      ...fm,
      acceptanceHeading: "Acceptance",
    });
    expect(s).toMatchObject({ done: 0, total: 1 });
  });
});

describe("auto format and the registry", () => {
  it("picks per file", () => {
    expect(adapterFor("auto", "---\nid: S-001\n---\n")).toBe(SPEC_ADAPTERS.frontmatter);
    expect(adapterFor("auto", "# S-001 · x")).toBe(SPEC_ADAPTERS.markdown);
    expect(adapterFor("auto", "---\nunterminated")).toBe(SPEC_ADAPTERS.markdown);
    expect(adapterFor("markdown", "---\nid: S-001\n---\n")).toBe(SPEC_ADAPTERS.markdown);
    expect(readSpec("---\nid: S-001\nstatus: done\n---\n", "a.md", auto)).toMatchObject({ id: "S-001" });
    expect(readSpec("# S-002 · Plain\n- [ ] a", "b.md", auto)).toMatchObject({ id: "S-002", total: 1 });
  });

  it("markdown keeps the plain format even when a block is present", () => {
    expect(readSpec("---\nid: S-001\n---\n# Title", "a.md", md)).toBeUndefined();
  });

  it("isSpecCandidate: ID prefix for plain markdown/filename IDs, any .md but README otherwise", () => {
    expect(isSpecCandidate("login.md", md)).toBe(false);
    expect(isSpecCandidate("S-001-login.md", md)).toBe(true);
    expect(isSpecCandidate("login.md", fm)).toBe(true);
    expect(isSpecCandidate("login.md", auto)).toBe(true);
    expect(isSpecCandidate("README.md", fm)).toBe(false);
    expect(isSpecCandidate("notes.txt", fm)).toBe(false);
    expect(isSpecCandidate("login.md", { ...fm, idFrom: "filename" })).toBe(false);
    expect(isSpecCandidate("login.md", { ...md, idFrom: "heading" })).toBe(true);
  });
});
