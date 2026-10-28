// Minimal MCP server core: JSON-RPC 2.0 messages in, responses out. No I/O here; the stdio loop in
// src/commands/mcp.ts feeds it one line at a time. Only the methods a tools-only server needs are
// implemented (initialize, ping, tools/list, tools/call); see S-005 for why there is no SDK.

/** Newest first; an unknown client version gets the newest one. */
export const PROTOCOL_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"] as const;

export const PARSE_ERROR = -32700;
export const INVALID_REQUEST = -32600;
export const METHOD_NOT_FOUND = -32601;
export const INVALID_PARAMS = -32602;
export const INTERNAL_ERROR = -32603;

export interface ToolOutput {
  readonly text: string;
  readonly structured?: Readonly<Record<string, unknown>>;
  readonly isError?: boolean;
}

export interface Tool {
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly inputSchema: Readonly<Record<string, unknown>>;
  readonly annotations?: Readonly<Record<string, unknown>>;
  /** Throwing is fine: the error message is returned to the agent as an `isError` result. */
  readonly run: (args: Readonly<Record<string, unknown>>) => ToolOutput;
}

export interface ServerInfo {
  readonly name: string;
  readonly version: string;
  readonly instructions?: string;
}

type Id = string | number | null;

export interface Response {
  readonly jsonrpc: "2.0";
  readonly id: Id;
  readonly result?: unknown;
  readonly error?: { readonly code: number; readonly message: string };
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

const ok = (id: Id, result: unknown): Response => ({ jsonrpc: "2.0", id, result });
const fail = (id: Id, code: number, message: string): Response => ({
  jsonrpc: "2.0",
  id,
  error: { code, message },
});

const negotiate = (requested: unknown): string =>
  PROTOCOL_VERSIONS.find((v) => v === requested) ?? PROTOCOL_VERSIONS[0];

const initialize = (id: Id, params: Obj, info: ServerInfo): Response =>
  ok(id, {
    protocolVersion: negotiate(params["protocolVersion"]),
    capabilities: { tools: { listChanged: false } },
    serverInfo: { name: info.name, version: info.version },
    ...(info.instructions ? { instructions: info.instructions } : {}),
  });

const listTools = (id: Id, tools: readonly Tool[]): Response =>
  ok(id, {
    tools: tools.map((t) => ({
      name: t.name,
      title: t.title,
      description: t.description,
      inputSchema: t.inputSchema,
      ...(t.annotations ? { annotations: t.annotations } : {}),
    })),
  });

const runTool = (tool: Tool, args: Obj): ToolOutput => {
  try {
    return tool.run(args);
  } catch (e) {
    return { text: `Error: ${(e as Error).message}`, isError: true };
  }
};

const callTool = (id: Id, params: Obj, tools: readonly Tool[]): Response => {
  const name = params["name"];
  if (typeof name !== "string") return fail(id, INVALID_PARAMS, "tools/call needs a string `name`");
  const tool = tools.find((t) => t.name === name);
  if (!tool)
    return fail(id, INVALID_PARAMS, `unknown tool "${name}" (tools: ${tools.map((t) => t.name).join(", ")})`);
  const args = params["arguments"] ?? {};
  if (!isObj(args)) return fail(id, INVALID_PARAMS, "tools/call `arguments` must be an object");
  const out = runTool(tool, args);
  return ok(id, {
    content: [{ type: "text", text: out.text }],
    ...(out.structured ? { structuredContent: out.structured } : {}),
    ...(out.isError ? { isError: true } : {}),
  });
};

const isId = (v: unknown): v is Id => typeof v === "string" || typeof v === "number" || v === null;

const dispatch = (id: Id, method: string, params: Obj, tools: readonly Tool[], info: ServerInfo) => {
  switch (method) {
    case "initialize":
      return initialize(id, params, info);
    case "ping":
      return ok(id, {});
    case "tools/list":
      return listTools(id, tools);
    case "tools/call":
      return callTool(id, params, tools);
    default:
      return fail(id, METHOD_NOT_FOUND, `method not found: ${method}`);
  }
};

/**
 * Handles one decoded JSON-RPC message. Returns the response, or undefined for notifications and
 * for responses sent by the client (this server never sends requests, so it ignores them).
 */
export const handleMessage = (
  msg: unknown,
  tools: readonly Tool[],
  info: ServerInfo,
): Response | undefined => {
  if (!isObj(msg) || msg["jsonrpc"] !== "2.0")
    return fail(null, INVALID_REQUEST, "expected a JSON-RPC 2.0 object");
  const { id, method } = msg;
  if (typeof method !== "string") return isId(id) ? undefined : fail(null, INVALID_REQUEST, "missing method");
  // Notifications (no id) never get a reply, not even for unknown methods.
  if (!("id" in msg)) return undefined;
  if (!isId(id)) return fail(null, INVALID_REQUEST, "id must be a string or a number");
  const params = msg["params"] ?? {};
  if (!isObj(params)) return fail(id, INVALID_PARAMS, "params must be an object");
  return dispatch(id, method, params, tools, info);
};

/** Handles one line of the stdio transport; returns the line to write back, if any. */
export const handleLine = (line: string, tools: readonly Tool[], info: ServerInfo): string | undefined => {
  if (line.trim() === "") return undefined;
  let msg: unknown;
  try {
    msg = JSON.parse(line);
  } catch {
    return JSON.stringify(fail(null, PARSE_ERROR, "parse error: each line must be one JSON-RPC message"));
  }
  const res = handleMessage(msg, tools, info);
  return res ? JSON.stringify(res) : undefined;
};
