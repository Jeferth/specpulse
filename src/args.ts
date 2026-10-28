export interface Args {
  readonly open: boolean;
  readonly serve: boolean;
  readonly port: number;
  readonly render: boolean;
  readonly help: boolean;
  readonly version: boolean;
  /** Print a plain-text progress summary instead of writing the dashboard. */
  readonly summary: boolean;
  /** Opt-in for the Live view: metadata of local Claude Code sessions (with --serve). */
  readonly claudeSessions: boolean;
  /** Project root; relative paths resolve against the process cwd. */
  readonly cwd?: string;
  /** Config path; relative paths resolve against the process cwd. */
  readonly config?: string;
}

export const DEFAULT_PORT = 4870;

const FLAGS = [
  "--open",
  "--serve",
  "--no-render",
  "--help",
  "-h",
  "--version",
  "-v",
  "--summary",
  "--claude-sessions",
];
const VALUED = ["--port", "--cwd", "--config"];

export const USAGE = `Usage: specpulse [options]
       specpulse <command> [options]

Builds a self-contained progress dashboard (index.html) for the project.

Commands:
  init              detect the project layout and write specpulse.config.json + data file
  mcp               run the MCP server over stdio (progress_status, progress_update, progress_snapshot)
  skill install     install the Claude Code skill (--project | --user, --force)
  <command> --help  help of a command

Options:
  --cwd <dir>       project root (default: current directory)
  --config <path>   config file (default: specpulse.config.json or .specpulse.json in the root)
  --no-render       skip the configured render command
  --summary         print a plain-text progress summary (for agents) instead of the dashboard
  --open            open the dashboard in the default browser
  --serve           serve the dashboard on http://localhost (127.0.0.1 only), updating live
  --claude-sessions with --serve: show metadata of local Claude Code sessions (opt-in)
  --port <n>        port for --serve (default: ${DEFAULT_PORT})
  -v, --version     print the version
  -h, --help        print this help`;

const portOf = (raw: string | undefined): number => {
  if (raw === undefined) return DEFAULT_PORT;
  const port = Number(raw);
  if (!Number.isInteger(port) || port <= 0 || port > 65535)
    throw new Error(`--port needs a number between 1 and 65535 (got "${raw}")`);
  return port;
};

const collect = (argv: readonly string[]) => {
  const flags = new Set<string>();
  const values = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i] ?? "";
    if (FLAGS.includes(a)) flags.add(a);
    else if (VALUED.includes(a)) {
      const v = argv[++i];
      if (v === undefined || v.startsWith("--")) throw new Error(`${a} needs a value`);
      values.set(a, v);
    } else throw new Error(`unknown option "${a}" (see --help)`);
  }
  return { flags, values };
};

export const parseArgs = (argv: readonly string[]): Args => {
  const { flags, values } = collect(argv);
  const cwd = values.get("--cwd");
  const config = values.get("--config");
  return {
    open: flags.has("--open"),
    serve: flags.has("--serve"),
    port: portOf(values.get("--port")),
    render: !flags.has("--no-render"),
    help: flags.has("--help") || flags.has("-h"),
    version: flags.has("--version") || flags.has("-v"),
    summary: flags.has("--summary"),
    claudeSessions: flags.has("--claude-sessions"),
    ...(cwd === undefined ? {} : { cwd }),
    ...(config === undefined ? {} : { config }),
  };
};
