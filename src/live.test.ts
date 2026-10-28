import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { request } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { commitSubject, insideProject, projectDirName, sessionFromJsonl } from "./claude-sessions.ts";
import { defaultConfig } from "./config.ts";
import { batcher } from "./debounce.ts";
import { generate } from "./generate.ts";
import type { Page } from "./html.ts";
import { createCheckRunner } from "./io/check.ts";
import { collectLive, readSessions } from "./io/live-state.ts";
import { allowedHost, serveLive } from "./io/serve.ts";
import {
  activityOf,
  type CheckState,
  groupChanged,
  newCommits,
  parseNameLog,
  parsePorcelain,
  recentFiles,
  tailLines,
} from "./live.ts";
import { isRelevant, phaseDir, watchedPaths } from "./watch-paths.ts";

const temps: string[] = [];
const temp = (prefix: string): string => {
  const d = mkdtempSync(join(tmpdir(), prefix));
  temps.push(d);
  return d;
};
afterAll(() => {
  for (const d of temps) rmSync(d, { recursive: true, force: true });
});
const put = (root: string, rel: string, text: string): void => {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), text);
};

describe("debounce (batcher)", () => {
  const fakeTimers = () => {
    let now = 0;
    const queue = new Map<number, { at: number; fn: () => void }>();
    let id = 0;
    return {
      timers: {
        set: (fn: () => void, ms: number) => {
          queue.set(++id, { at: now + ms, fn });
          return id;
        },
        clear: (h: unknown) => void queue.delete(h as number),
      },
      advance: (ms: number) => {
        now += ms;
        for (const [k, t] of [...queue]) {
          if (t.at > now) continue;
          queue.delete(k);
          t.fn();
        }
      },
    };
  };

  it("flushes once after the quiet period, de-duplicating items", () => {
    const t = fakeTimers();
    const flushed: string[][] = [];
    const b = batcher<string>(300, (items) => flushed.push(items), t.timers);
    b.push("a");
    t.advance(200);
    b.push("b");
    b.push("a");
    t.advance(299);
    expect(flushed).toEqual([]);
    t.advance(1);
    expect(flushed).toEqual([["a", "b"]]);
  });

  it("cancel drops pending items", () => {
    const t = fakeTimers();
    const flushed: string[][] = [];
    const b = batcher<string>(300, (items) => flushed.push(items), t.timers);
    b.push("a");
    b.cancel();
    t.advance(1000);
    expect(flushed).toEqual([]);
  });
});

describe("live helpers", () => {
  it("parses porcelain (renames keep the new path, quotes removed) and groups by folder", () => {
    const files = parsePorcelain(' M src/a.ts\n?? docs/new.md\nR  old.ts -> src/b.ts\n M "with space.md"\n');
    expect(files).toEqual([
      { code: " M", path: "src/a.ts" },
      { code: "??", path: "docs/new.md" },
      { code: "R ", path: "src/b.ts" },
      { code: " M", path: "with space.md" },
    ]);
    expect(groupChanged(files).map((g) => [g.dir, g.files.map((f) => f.path)])).toEqual([
      [".", ["with space.md"]],
      ["docs", ["docs/new.md"]],
      ["src", ["src/a.ts", "src/b.ts"]],
    ]);
  });

  it("recentFiles keeps the window, newest first, latest time per path", () => {
    const now = Date.parse("2026-10-28T12:00:00Z");
    const r = recentFiles(
      [
        { path: "a", at: "2026-10-28T11:55:00Z" },
        { path: "b", at: "2026-10-28T11:30:00Z" },
        { path: "a", at: "2026-10-28T11:58:00Z" },
        { path: "c", at: "2026-10-28T11:59:00Z" },
      ],
      now,
      10 * 60_000,
    );
    expect(r).toEqual([
      { path: "c", at: "2026-10-28T11:59:00Z" },
      { path: "a", at: "2026-10-28T11:58:00Z" },
    ]);
  });

  it("diff of what changed: new commits only after the first snapshot", () => {
    const a = [{ hash: "1" }];
    const b = [{ hash: "2" }, { hash: "1" }];
    expect(newCommits(a, b)).toEqual(["2"]);
    expect(activityOf(["docs/x.md"], a, b)).toEqual({ files: ["docs/x.md"], newCommits: ["2"] });
    expect(activityOf([], [], b).newCommits).toEqual([]);
  });

  it("parseNameLog and tailLines", () => {
    expect(
      parseNameLog("\x1e2026-10-28T11:00:00Z\n\nsrc/a.ts\ndocs/b.md\n\x1e2026-10-28T10:00:00Z\n\nc\n"),
    ).toEqual([
      { path: "src/a.ts", at: "2026-10-28T11:00:00Z" },
      { path: "docs/b.md", at: "2026-10-28T11:00:00Z" },
      { path: "c", at: "2026-10-28T10:00:00Z" },
    ]);
    expect(tailLines("a\n\nb\r\nc  \n", 2)).toEqual(["b", "c"]);
  });

  it("watches inputs and git refs, never the whole root nor the index", () => {
    const c = defaultConfig("x");
    expect(phaseDir("docs/phase-{n}/README.md")).toBe("docs");
    expect(phaseDir("PHASE-{n}.md")).toBe(".");
    const paths = watchedPaths({ ...c, roadmap: "ROADMAP.md", phaseFile: "PHASE-{n}.md" }, [1, 2]);
    expect(paths).toEqual([
      { path: "docs/specs", kind: "dir" },
      { path: ".git/refs", kind: "dir" },
      { path: "ROADMAP.md", kind: "file" },
      { path: "docs/progress.json", kind: "file" },
      { path: "PHASE-1.md", kind: "file" },
      { path: "PHASE-2.md", kind: "file" },
      { path: ".git/HEAD", kind: "file" },
      { path: ".git/packed-refs", kind: "file" },
    ]);
    expect(isRelevant(".cache/specpulse/index.html", ".cache/specpulse")).toBe(false);
    expect(isRelevant(".git/index", "out")).toBe(false);
    expect(isRelevant(".git/refs/heads/main", "out")).toBe(true);
    expect(isRelevant("docs/specs/A-001.md", "out")).toBe(true);
  });
});

describe("Claude Code sessions", () => {
  const root = "D:\\work\\app";
  const lines = [
    {
      type: "user",
      timestamp: "2026-10-28T10:00:00Z",
      message: { role: "user", content: "SECRET PROMPT do the thing" },
    },
    {
      type: "assistant",
      timestamp: "2026-10-28T10:01:00Z",
      message: {
        content: [
          { type: "text", text: "SECRET REPLY sure" },
          {
            type: "tool_use",
            name: "Edit",
            input: { file_path: "D:\\work\\app\\src\\a.ts", old_string: "SECRET OLD" },
          },
          { type: "tool_use", name: "Read", input: { file_path: "C:\\Users\\me\\.ssh\\id_rsa" } },
          {
            type: "tool_use",
            name: "Bash",
            input: { command: 'git commit -m "feat: add a (APP-001)" && echo SECRET' },
          },
        ],
      },
    },
    {
      type: "user",
      timestamp: "2026-10-28T10:02:00Z",
      message: { content: [{ type: "tool_result", content: "SECRET OUTPUT" }] },
    },
    "not json at all",
  ];
  const jsonl = lines.map((l) => (typeof l === "string" ? l : JSON.stringify(l))).join("\n");

  it("the project folder name follows Claude Code's encoding", () => {
    expect(projectDirName("D:\\projetos\\specpulse")).toBe("D--projetos-specpulse");
    expect(projectDirName("/home/me/my.app")).toBe("-home-me-my-app");
  });

  it("extracts only metadata: tools, files inside the project, times, commit subjects", () => {
    const s = sessionFromJsonl("abc", jsonl, root);
    expect(s).toEqual({
      id: "abc",
      start: "2026-10-28T10:00:00Z",
      last: "2026-10-28T10:02:00Z",
      tools: [
        { name: "Bash", at: "2026-10-28T10:01:00Z" },
        { name: "Read", at: "2026-10-28T10:01:00Z" },
        { name: "Edit", at: "2026-10-28T10:01:00Z", file: "src/a.ts" },
      ],
      commits: ["feat: add a (APP-001)"],
    });
    expect(JSON.stringify(s)).not.toMatch(/SECRET|ssh|id_rsa/);
  });

  it("insideProject hides outside paths; commitSubject reads -m and heredocs", () => {
    expect(insideProject("/home/me/app/x/y.ts", "/home/me/app")).toBe("x/y.ts");
    expect(insideProject("/home/me/app2/y.ts", "/home/me/app")).toBeUndefined();
    expect(insideProject("../etc/passwd", "/home/me/app")).toBeUndefined();
    expect(insideProject("d:\\Work\\App\\a.ts", "D:\\work\\app")).toBe("a.ts");
    expect(commitSubject("git status")).toBeUndefined();
    expect(commitSubject("git commit -q -F - <<'EOF'\nfeat: x\n\nbody\nEOF")).toBe("feat: x");
    expect(commitSubject(`git commit -m "$(cat <<'EOF'\nfix: y\nEOF\n)"`)).toBe("fix: y");
  });

  it("without the opt-in no transcript is read (the reader is never called)", () => {
    const home = temp("specpulse-home-");
    put(home, `.claude/projects/${projectDirName(home)}/s1.jsonl`, jsonl);
    const throwing = () => {
      throw new Error("must not read ~/.claude");
    };
    const base = {
      root: home,
      idPattern: "[A-Z]+-\\d{3}",
      commits: 5,
      home,
      now: Date.now(),
      sessions: throwing,
    };
    const idle: CheckState = { status: "none" };
    expect(collectLive({ ...base, claudeSessions: false }, idle).sessions).toBeUndefined();
    expect(() => collectLive({ ...base, claudeSessions: true }, idle)).toThrow(/must not read/);
  });

  it("with the opt-in, reads the newest transcripts of this project only", () => {
    const home = temp("specpulse-home-");
    const root = join(home, "proj");
    mkdirSync(root);
    put(home, `.claude/projects/${projectDirName(root)}/s1.jsonl`, jsonl);
    put(home, ".claude/projects/other-project/s2.jsonl", jsonl);
    const sessions = readSessions(root, home);
    expect(sessions.map((s) => s.id)).toEqual(["s1"]);
  });
});

describe("check runner", () => {
  it("never runs in parallel: a request while running queues exactly one more run", async () => {
    const root = temp("specpulse-check-");
    const states: CheckState[] = [];
    const runs: number[] = [];
    await new Promise<void>((done) => {
      const runner = createCheckRunner(root, 'node -e "console.log(1)"', (s) => {
        states.push(s);
        if (s.status === "running") runs.push(Date.now());
        if (s.status === "passed" && runs.length === 2) done();
      });
      runner.run();
      runner.run();
      runner.run();
    });
    expect(states.map((s) => s.status)).toEqual(["running", "passed", "running", "passed"]);
    expect(states[1]).toMatchObject({ code: 0, output: ["1"] });
  });

  it("reports failures with the exit code; no command means status none", async () => {
    const root = temp("specpulse-check-");
    const failed = await new Promise<CheckState>((done) => {
      const r = createCheckRunner(root, 'node -e "process.exit(3)"', (s) => s.status === "failed" && done(s));
      r.run();
    });
    expect(failed.code).toBe(3);
    expect(createCheckRunner(root, undefined, () => {}).state()).toEqual({ status: "none" });
  });
});

describe("live server", () => {
  const call = (port: number, method: string, path: string, headers: Record<string, string> = {}) =>
    new Promise<{ status: number; body: string }>((done, fail) => {
      const req = request({ host: "127.0.0.1", port, method, path, headers }, (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => done({ status: res.statusCode ?? 0, body }));
      });
      req.on("error", fail);
      req.end();
    });

  /** Complete `model` events in an SSE buffer. */
  const modelsIn = (buf: string): Page[] =>
    buf
      .split("\n\n")
      .slice(0, -1)
      .flatMap((block) => {
        const m = /^event: model\ndata: (.*)$/s.exec(block);
        return m?.[1] ? [JSON.parse(m[1]) as Page] : [];
      });

  const nextModel = (port: number, until: (p: Page) => boolean) =>
    new Promise<Page>((done, fail) => {
      const req = request({ host: "127.0.0.1", port, path: "/events" }, (res) => {
        let buf = "";
        res.on("data", (c) => {
          buf += c;
          const hit = modelsIn(buf).find(until);
          buf = buf.slice(buf.lastIndexOf("\n\n") + 2);
          if (!hit) return;
          req.destroy();
          done(hit);
        });
      });
      req.on("error", (e) => (e.message.includes("socket hang up") ? undefined : fail(e)));
      req.end();
    });

  it("only accepts its own host", () => {
    expect(allowedHost("localhost:4870", 4870)).toBe(true);
    expect(allowedHost("127.0.0.1:4870", 4870)).toBe(true);
    expect(allowedHost("evil.example:4870", 4870)).toBe(false);
    expect(allowedHost(undefined, 4870)).toBe(false);
  });

  it("pushes a rebuilt model when a spec changes, guards POST with a token, serves the token", async () => {
    const root = temp("specpulse-live-");
    put(
      root,
      "docs/roadmap.md",
      "| P | N | T | F |\n|---|---|---|---|\n| [1](phase-1/README.md) | Core | t | f |\n",
    );
    put(root, "docs/phase-1/README.md", "| **1.1 Parser** | parses |\n");
    put(root, "docs/specs/APP-001-parser.md", "# APP-001 · Parser\n\n- [ ] a\n- [ ] b\n");
    put(root, "docs/progress.json", '{"milestones":{"1.1":{"specs":["APP-001"]}}}');
    spawnSync("git", ["init", "-q"], { cwd: root });
    const config = {
      ...defaultConfig("live"),
      live: { ...defaultConfig("live").live, check: 'node -e "1"' },
    };
    const { page } = generate({ root, config, render: false });
    const port = 20000 + Math.floor(Math.random() * 20000);
    const listening = new Promise<void>((done) => {
      const srv = serveLive({ root, config, port, page, claudeSessions: false, onListen: () => done() });
      afterAll(() => srv.close());
    });
    await listening;

    const index = await call(port, "GET", "/", { host: `localhost:${port}` });
    expect(index.status).toBe(200);
    expect(index.body).toMatch(/id="specpulse-live">\{"token":"[0-9a-f]{32}"\}/);
    const token = /"token":"([0-9a-f]+)"/.exec(index.body)?.[1] ?? "";

    expect((await call(port, "POST", "/check", { host: `localhost:${port}` })).status).toBe(403);
    expect(
      (await call(port, "POST", "/check", { host: `localhost:${port}`, "x-specpulse-token": "nope" })).status,
    ).toBe(403);
    expect(
      (await call(port, "POST", "/check", { host: `localhost:${port}`, "x-specpulse-token": token })).status,
    ).toBe(202);
    expect(
      (await call(port, "POST", "/render", { host: `localhost:${port}`, "x-specpulse-token": token })).status,
    ).toBe(400);
    expect((await call(port, "GET", "/", { host: `evil.example:${port}` })).status).toBe(403);
    expect((await call(port, "GET", "/../package.json", { host: `localhost:${port}` })).status).not.toBe(200);

    const started = Date.now();
    const updated = nextModel(port, (p) => p.model.specs[0]?.done === 1);
    setTimeout(
      () => put(root, "docs/specs/APP-001-parser.md", "# APP-001 · Parser\n\n- [x] a\n- [ ] b\n"),
      200,
    );
    const p = await updated;
    expect(p.model.phases[0]?.milestones[0]?.progress).toBe(0.5);
    expect(Date.now() - started).toBeLessThan(2000 + 200);
    const model = JSON.parse(
      (await call(port, "GET", "/model.json", { host: `localhost:${port}` })).body,
    ) as Page;
    expect(model.model.specs[0]?.done).toBe(1);
  }, 15_000);
});
