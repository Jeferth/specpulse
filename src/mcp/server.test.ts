import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { projectWorkspace } from "../commands/mcp.ts";
import { loadConfig } from "../io/load-config.ts";
import { parseMcpArgs } from "./args.ts";
import { handleLine, type Tool } from "./protocol.ts";
import { progressTools, SERVER_INSTRUCTIONS } from "./tools.ts";

const INFO = { name: "specpulse", version: "1.2.3", instructions: SERVER_INSTRUCTIONS };

type Reply = { id: unknown; result?: Record<string, unknown>; error?: { code: number; message: string } };

/** A fake client: sends one message per line, like the stdio transport, and decodes the reply. */
const client = (tools: readonly Tool[]) => {
  let next = 1;
  const send = (msg: unknown): Reply | undefined => {
    const out = handleLine(JSON.stringify(msg), tools, INFO);
    return out === undefined ? undefined : (JSON.parse(out) as Reply);
  };
  const request = (method: string, params?: unknown): Reply =>
    send({ jsonrpc: "2.0", id: next++, method, ...(params === undefined ? {} : { params }) }) ?? {
      id: undefined,
    };
  const call = (name: string, args: Record<string, unknown> = {}) => {
    const r = request("tools/call", { name, arguments: args }).result ?? {};
    const content = r["content"] as { type: string; text: string }[];
    return {
      text: content[0]?.text ?? "",
      structured: r["structuredContent"],
      isError: r["isError"] === true,
    };
  };
  return { send, request, call };
};

describe("MCP protocol", () => {
  const echo: Tool = {
    name: "echo",
    title: "Echo",
    description: "echo",
    inputSchema: { type: "object" },
    run: (args) => {
      if (args["boom"]) throw new Error("boom");
      return { text: JSON.stringify(args), structured: { ...args } };
    },
  };
  const c = client([echo]);

  it("negotiates the protocol version", () => {
    const r = c.request("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: {} });
    expect(r.result).toEqual({
      protocolVersion: "2025-06-18",
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: "specpulse", version: "1.2.3" },
      instructions: SERVER_INSTRUCTIONS,
    });
    expect(c.request("initialize", { protocolVersion: "1999-01-01" }).result?.["protocolVersion"]).toBe(
      "2025-11-25",
    );
  });

  it("ignores notifications and answers ping", () => {
    expect(c.send({ jsonrpc: "2.0", method: "notifications/initialized" })).toBeUndefined();
    expect(c.send({ jsonrpc: "2.0", method: "whatever" })).toBeUndefined();
    expect(c.request("ping").result).toEqual({});
  });

  it("reports protocol errors with JSON-RPC codes", () => {
    expect(c.request("resources/list").error?.code).toBe(-32601);
    expect(c.request("tools/call", { arguments: {} }).error?.code).toBe(-32602);
    expect(c.request("tools/call", { name: "nope" }).error?.message).toMatch(/unknown tool "nope"/);
    expect(c.request("tools/call", { name: "echo", arguments: [] }).error?.code).toBe(-32602);
    expect(JSON.parse(handleLine("{not json", [echo], INFO) ?? "")).toMatchObject({
      id: null,
      error: { code: -32700 },
    });
    expect(handleLine("   ", [echo], INFO)).toBeUndefined();
  });

  it("returns tool failures as isError results", () => {
    expect(c.call("echo", { a: 1 })).toEqual({ text: '{"a":1}', structured: { a: 1 }, isError: false });
    expect(c.call("echo", { boom: true })).toMatchObject({ text: "Error: boom", isError: true });
  });
});

describe("MCP server against examples/basic", () => {
  let root = "";
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "specpulse-mcp-"));
    cpSync(join(import.meta.dirname, "../../examples/basic"), root, { recursive: true });
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  const connect = () => {
    const { config } = loadConfig(root);
    const c = client(progressTools(projectWorkspace(root, config)));
    c.request("initialize", { protocolVersion: "2025-11-25", capabilities: {} });
    c.send({ jsonrpc: "2.0", method: "notifications/initialized" });
    return c;
  };
  const data = () => JSON.parse(readFileSync(join(root, "docs/progress.json"), "utf8"));

  it("lists the three tools with schemas and agent-facing descriptions", () => {
    const tools = connect().request("tools/list").result?.["tools"] as Record<string, unknown>[];
    expect(tools.map((t) => t["name"])).toEqual(["progress_status", "progress_update", "progress_snapshot"]);
    for (const t of tools) {
      expect(t["inputSchema"]).toMatchObject({ type: "object" });
      expect(String(t["description"]).length).toBeGreaterThan(80);
    }
  });

  it("progress_status returns text and structured content, with filters", () => {
    const c = connect();
    const all = c.call("progress_status");
    expect(all.text).toContain("Current phase: 1 Core");
    expect(all.text).toContain("APP-002 CLI: 2 of 2 criteria open");
    expect(all.structured).toMatchObject({ currentPhase: { n: 1, name: "Core" } });
    expect(c.call("progress_status", { phase: 2 }).text).toContain("2.1 Canvas");
    expect(c.call("progress_status", { phase: 2 }).text).not.toContain("1.1 Parser");
    expect(c.call("progress_status", { spec: "APP-009" })).toMatchObject({ isError: true });
    expect(c.call("progress_status", { phase: "x" }).text).toMatch(/must be an integer/);
  });

  it("progress_update writes the data file and refuses rule breaks", () => {
    const c = connect();
    const ok = c.call("progress_update", { milestone: "2.1", status: "doing", source: "spike branch" });
    expect(ok.isError).toBe(false);
    expect(ok.text).toContain("2.1 Canvas: doing 50% | manual (docs/progress.json: spike branch)");
    expect(data().milestones["2.1"]).toEqual({ status: "doing", source: "spike branch" });

    expect(c.call("progress_update", { milestone: "2.1", status: "done" }).text).toMatch(/needs `source`/);
    expect(c.call("progress_update", { image: "hero", approved: true }).text).toMatch(/owner's decision/);
    expect(c.call("progress_update", { milestone: "9.9", note: "x" }).text).toMatch(/not in the roadmap/);
    expect(c.call("progress_update", { milestone: "1.1", specs: ["APP-001", "APP-777"] }).text).toMatch(
      /Warning: no spec file found for APP-777/,
    );
  });

  it("progress_snapshot writes the dashboard", () => {
    const r = connect().call("progress_snapshot");
    expect(r.isError, r.text).toBe(false);
    const index = (r.structured as { index: string }).index;
    expect(existsSync(index)).toBe(true);
    expect(r.text).toContain("Current phase: 1 Core");
  });
});

describe("parseMcpArgs", () => {
  it("reads --cwd, --config and --help and rejects anything else", () => {
    expect(parseMcpArgs(["--cwd", "a", "--config", "b.json"])).toEqual({
      help: false,
      cwd: "a",
      config: "b.json",
    });
    expect(parseMcpArgs(["-h"]).help).toBe(true);
    expect(() => parseMcpArgs(["--cwd"])).toThrow(/needs a value/);
    expect(() => parseMcpArgs(["--port", "1"])).toThrow(/unknown option/);
  });
});
