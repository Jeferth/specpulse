import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parseSkillArgs } from "../skill-install.ts";
import { BUNDLED_SKILL, installSkill } from "./skill.ts";

/** Frontmatter fields of a SKILL.md (simple `key: value` lines between `---`). */
const frontmatter = (md: string): Record<string, string> => {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(md);
  if (!m?.[1]) return {};
  return Object.fromEntries(
    m[1]
      .split(/\r?\n/)
      .map((l) => /^([a-z-]+):\s*(.+)$/.exec(l))
      .filter((x) => x !== null)
      .map((x) => [x[1], x[2]?.trim() ?? ""]),
  );
};

describe("bundled SKILL.md", () => {
  it("has a frontmatter with name and an actionable description", () => {
    const fm = frontmatter(readFileSync(BUNDLED_SKILL, "utf8"));
    expect(fm["name"]).toBe("specpulse");
    expect(fm["description"]?.length ?? 0).toBeGreaterThan(80);
    expect(fm["description"]).toMatch(/use (it )?when/i);
  });
});

describe("installSkill", () => {
  let dir = "";
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "specpulse-skill-"));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("creates the project folder and refuses to overwrite without --force", () => {
    const target = installSkill({ scope: "project", force: false, cwd: dir });
    expect(target).toBe(join(dir, ".claude/skills/specpulse/SKILL.md"));
    expect(readFileSync(target, "utf8")).toBe(readFileSync(BUNDLED_SKILL, "utf8"));
    writeFileSync(target, "edited");
    expect(() => installSkill({ scope: "project", force: false, cwd: dir })).toThrow(/--force/);
    expect(readFileSync(target, "utf8")).toBe("edited");
    installSkill({ scope: "project", force: true, cwd: dir });
    expect(readFileSync(target, "utf8")).not.toBe("edited");
  });

  it("installs into the (injected) home directory with --user", () => {
    const home = join(dir, "home");
    const target = installSkill({ scope: "user", force: false, cwd: join(dir, "project"), home });
    expect(target).toBe(join(home, ".claude/skills/specpulse/SKILL.md"));
  });
});

describe("parseSkillArgs", () => {
  it("defaults to --project and reads --user, --force and --cwd", () => {
    expect(parseSkillArgs(["install"])).toEqual({ help: false, scope: "project", force: false });
    expect(parseSkillArgs(["install", "--user", "--force", "--cwd", "x"])).toEqual({
      help: false,
      scope: "user",
      force: true,
      cwd: "x",
    });
    expect(parseSkillArgs([]).help).toBe(true);
  });

  it("rejects unknown subcommands, options and conflicting scopes", () => {
    expect(() => parseSkillArgs(["remove"])).toThrow(/unknown subcommand/);
    expect(() => parseSkillArgs(["install", "--global"])).toThrow(/unknown option/);
    expect(() => parseSkillArgs(["install", "--project", "--user"])).toThrow(/not both/);
  });
});
