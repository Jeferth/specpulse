import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { criteriaList } from "./client-views.ts";
import { defaultConfig } from "./config.ts";
import { parseGitLog } from "./git-log.ts";
import { detectLayout } from "./init.ts";
import { commitIdPattern, readCommits, readModelInput } from "./io/repo.ts";
import { buildModel } from "./model.ts";
import { folderIdPattern, folderSpec, folderTitle, groupedCriteria, readableName } from "./spec-folder.ts";

const SPEC_KIT_SPEC = `# Feature Specification: Photo Albums

**Feature Branch**: \`001-photo-albums\`
**Status**: Draft

## User Scenarios & Testing *(mandatory)*

1. **Given** an album, **When** I drag a photo, **Then** it moves
`;

const SPEC_KIT_TASKS = `# Tasks: Photo Albums

## Phase 1: Setup (Shared Infrastructure)

- [X] T001 Create project structure per implementation plan
- [x] T002 [P] Configure linting

## Phase 3: User Story 1 - Organize albums (Priority: P1) 🎯 MVP

### Implementation for User Story 1

- [ ] T010 [P] [US1] Create Album model in src/models/album.ts
- [ ] T011 [US1] Implement drag and drop in src/ui/grid.ts
`;

const KIRO_TASKS = `# Implementation Plan

- [x] 1. Set up the auth module
  - [x] 1.1 Create the token store
  - [ ] 1.2 Add refresh
- [ ] 2. Wire the login screen
`;

const OPENSPEC_TASKS = `## 1. Implementation
- [x] 1.1 Add OTP secret to the user model
- [ ] 1.2 Verify the code on login

## 2. Docs
- [ ] 2.1 Update the README
`;

const file = (name: string, text: string) => ({ name, text });

describe("folderSpec", () => {
  it("reads a spec-kit feature: folder ID, spec.md title, tasks.md checkboxes grouped by phase", () => {
    const s = folderSpec(
      "001-photo-albums",
      "specs",
      [file("spec.md", SPEC_KIT_SPEC), file("plan.md", "# Plan"), file("tasks.md", SPEC_KIT_TASKS)],
      {},
    );
    expect(s).toMatchObject({
      id: "001-photo-albums",
      title: "Photo Albums",
      file: "specs/001-photo-albums/tasks.md",
      done: 2,
      total: 4,
    });
    expect(s?.criteria.map((c) => c.group)).toEqual([
      "Phase 1: Setup (Shared Infrastructure)",
      "Phase 1: Setup (Shared Infrastructure)",
      "Phase 3: User Story 1 - Organize albums (Priority: P1) 🎯 MVP",
      "Phase 3: User Story 1 - Organize albums (Priority: P1) 🎯 MVP",
    ]);
    expect(s?.criteria[0]).toMatchObject({
      text: "T001 Create project structure per implementation plan",
      done: true,
    });
  });

  it("reads a Kiro spec: generic heading falls back to the folder name, nested tasks count", () => {
    const s = folderSpec(
      "user-auth",
      ".kiro/specs",
      [file("requirements.md", "# Requirements Document\n\n## Introduction"), file("tasks.md", KIRO_TASKS)],
      {},
    );
    expect(s).toMatchObject({ id: "user-auth", title: "User auth", done: 2, total: 4 });
    expect(s?.criteria.every((c) => c.group === undefined)).toBe(true);
  });

  it("reads an OpenSpec change: proposal title without its prefix, numbered groups", () => {
    const s = folderSpec(
      "add-2fa",
      "openspec/changes",
      [file("proposal.md", "# Change: Add two-factor login\n\n## Why"), file("tasks.md", OPENSPEC_TASKS)],
      {},
    );
    expect(s).toMatchObject({ id: "add-2fa", title: "Add two-factor login", done: 1, total: 3 });
    expect([...new Set(s?.criteria.map((c) => c.group))]).toEqual(["1. Implementation", "2. Docs"]);
  });

  it("uses the title file's checkboxes without tasks.md, and honours acceptanceHeading", () => {
    const md =
      "# Export\n\n## Notes\n- [ ] not a criterion\n\n## Acceptance\n- [x] exports\n- [ ] keeps text\n";
    expect(folderSpec("export", "docs/specs", [file("README.md", md)], {})?.total).toBe(3);
    const s = folderSpec("export", "docs/specs", [file("README.md", md)], {
      acceptanceHeading: "Acceptance",
    });
    expect(s).toMatchObject({ file: "docs/specs/export/README.md", done: 1, total: 2 });
  });

  it("a folder with none of the known files is not a spec (OpenSpec archive/)", () => {
    expect(folderSpec("archive", "openspec/changes", [], {})).toBeUndefined();
    expect(folderSpec("002-x", "specs", [file("TASKS.md", "- [ ] a")], {})?.total).toBe(1);
  });
});

describe("titles and groups", () => {
  it("readable folder names", () => {
    expect(readableName("001-photo-albums")).toBe("Photo albums");
    expect(readableName("user_auth")).toBe("User auth");
    expect(readableName("007")).toBe("007");
  });

  it("folderTitle", () => {
    expect(folderTitle(undefined, "003-chat")).toBe("Chat");
    expect(folderTitle("# Payments refactor", "x")).toBe("Payments refactor");
    expect(folderTitle("# Tasks", "003-chat")).toBe("Chat");
  });

  it("groupedCriteria ignores sub-headings and keeps the last ## heading", () => {
    const c = groupedCriteria("- [ ] before\n## A\n### a.1\n- [x] in a\n## B\n- [ ] in b\n");
    expect(c.map((x) => x.group ?? null)).toEqual([null, "A", "B"]);
  });
});

describe("folderIdPattern", () => {
  it("finds folder names as whole words only, longest first", () => {
    const ids = ["001-photo-albums", "001-photo", "user-auth"];
    const log = [
      "a1\x1f2026-10-01T00:00:00Z\x1fMerge branch '001-photo-albums'\x1f\x1e",
      "a2\x1f2026-10-02T00:00:00Z\x1ffeat: login (user-auth)\x1f\x1e",
      "a3\x1f2026-10-03T00:00:00Z\x1ffix: 404 in 1001-photo-albums-v2 and xuser-auth\x1f\x1e",
      "a4\x1f2026-10-04T00:00:00Z\x1fchore: 001-photo cleanup\x1f\x1e",
    ].join("");
    expect(parseGitLog(log, folderIdPattern(ids)).map((c) => c.specs)).toEqual([
      ["001-photo-albums"],
      ["user-auth"],
      [],
      ["001-photo"],
    ]);
  });

  it("escapes regex characters and matches nothing without specs", () => {
    expect(new RegExp(folderIdPattern(["v1.2"])).test("v1x2")).toBe(false);
    expect(new RegExp(folderIdPattern([])).test("anything")).toBe(false);
  });
});

describe("criteriaList", () => {
  it("renders flat criteria as one list and grouped ones under a heading with counts", () => {
    expect(criteriaList([{ text: "a", done: true }])).not.toContain("cgroup");
    const html = criteriaList([
      { text: "a", done: true, group: "Phase 1" },
      { text: "b", done: false, group: "Phase 1" },
      { text: "c", done: false, group: "Phase 2" },
    ]);
    expect(html.match(/class="cgroup"/g)).toHaveLength(2);
    expect(html).toContain("Phase 1 <small>1/2</small>");
  });
});

describe("detectLayout with folder specs", () => {
  it("detects spec-kit, Kiro and OpenSpec layouts", () => {
    expect(
      detectLayout({
        paths: [".specify/memory/constitution.md", "specs/001-a/spec.md", "specs/001-a/tasks.md"],
      }),
    ).toMatchObject({ specsDir: "specs", specFormat: "folder", specFiles: [] });
    expect(detectLayout({ paths: [".kiro/specs/user-auth/requirements.md"] })).toMatchObject({
      specsDir: ".kiro/specs",
      specFormat: "folder",
    });
    expect(
      detectLayout({
        paths: ["openspec/changes/add-2fa/proposal.md", "openspec/specs/auth/spec.md", "openspec/project.md"],
      }),
    ).toMatchObject({ specsDir: "openspec/changes", specFormat: "folder" });
  });

  it("flat specs named by ID win over folders", () => {
    const d = detectLayout({ paths: ["docs/specs/APP-001-x.md", "specs/001-a/tasks.md"] });
    expect(d).toMatchObject({ specsDir: "docs/specs", idPattern: "APP-\\d{3}" });
    expect(d.specFormat).toBeUndefined();
  });
});

describe("folder specs on disk", () => {
  const root = mkdtempSync(join(tmpdir(), "specpulse-folder-"));
  afterAll(() => rmSync(root, { recursive: true, force: true }));
  const put = (rel: string, text: string): void => {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), text);
  };
  const git = (...a: string[]) =>
    spawnSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", ...a], { cwd: root, encoding: "utf8" });

  it("reads every feature folder and links commits by folder name", () => {
    put("specs/001-photo-albums/spec.md", SPEC_KIT_SPEC);
    put("specs/001-photo-albums/tasks.md", SPEC_KIT_TASKS);
    put("specs/002-sharing/spec.md", "# Feature Specification: Sharing\n");
    put("specs/notes.md", "- [ ] loose files are ignored");
    mkdirSync(join(root, "specs/empty"));
    git("init", "-q");
    git("add", "-A");
    git("commit", "-qm", "feat: albums grid (001-photo-albums)");
    const config = {
      ...defaultConfig("t"),
      specs: { ...defaultConfig("t").specs, dir: "specs", format: "folder" as const },
    };
    const pattern = commitIdPattern(root, config);
    const model = buildModel(readModelInput(root, config, readCommits(root, pattern)));
    expect(model.specs.map((s) => [s.id, s.title, s.done, s.total, s.commits.length])).toEqual([
      ["001-photo-albums", "Photo Albums", 2, 4, 1],
      ["002-sharing", "Sharing", 0, 0, 0],
    ]);
  });
});
