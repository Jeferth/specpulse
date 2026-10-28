// Arguments of `specpulse mcp`.

export interface McpArgs {
  readonly help: boolean;
  readonly cwd?: string;
  readonly config?: string;
}

export const MCP_USAGE = `Usage: specpulse mcp [--cwd <dir>] [--config <path>]

Runs an MCP server over stdio (JSON-RPC, one message per line) with the tools
progress_status, progress_update and progress_snapshot.

Register it in Claude Code:  claude mcp add specpulse -- npx specpulse mcp`;

export const parseMcpArgs = (argv: readonly string[]): McpArgs => {
  const values: Record<string, string> = {};
  let help = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i] ?? "";
    if (a === "--help" || a === "-h") help = true;
    else if (a === "--cwd" || a === "--config") {
      const v = argv[++i];
      if (v === undefined || v.startsWith("--")) throw new Error(`${a} needs a value`);
      values[a.slice(2)] = v;
    } else throw new Error(`unknown option "${a}" for \`specpulse mcp\` (see specpulse mcp --help)`);
  }
  const { cwd, config } = values;
  return { help, ...(cwd === undefined ? {} : { cwd }), ...(config === undefined ? {} : { config }) };
};
