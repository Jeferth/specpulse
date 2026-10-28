// `specpulse mcp`: MCP server over stdio. stdout carries only protocol lines; diagnostics go to stderr.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createInterface } from "node:readline";
import type { Config } from "../config.ts";
import { generate } from "../generate.ts";
import { loadConfig } from "../io/load-config.ts";
import { commitIdPattern, readCommits, readModelInput } from "../io/repo.ts";
import { packageVersion } from "../io/version.ts";
import { MCP_USAGE, parseMcpArgs } from "../mcp/args.ts";
import { handleLine } from "../mcp/protocol.ts";
import { progressTools, SERVER_INSTRUCTIONS, type Workspace } from "../mcp/tools.ts";
import { buildModel } from "../model.ts";

/** The real project behind the MCP tools; the model is re-read on every call so edits show up. */
export const projectWorkspace = (root: string, config: Config): Workspace => {
  const dataPath = resolve(root, config.dataFile);
  return {
    dataFile: config.dataFile,
    model: () => buildModel(readModelInput(root, config, readCommits(root, commitIdPattern(root, config)))),
    readData: () => (existsSync(dataPath) ? readFileSync(dataPath, "utf8") : undefined),
    writeData: (text) => {
      mkdirSync(dirname(dataPath), { recursive: true });
      writeFileSync(dataPath, text);
    },
    snapshot: () => generate({ root, config, render: false }).index,
  };
};

export const runMcp = async (argv: readonly string[]): Promise<void> => {
  const args = parseMcpArgs(argv);
  if (args.help) return void console.log(MCP_USAGE);
  const root = resolve(args.cwd ?? ".");
  const { config } = loadConfig(root, args.config);
  // Anything printed to stdout would corrupt the protocol stream, so stray logs go to stderr.
  console.log = console.error;
  const tools = progressTools(projectWorkspace(root, config));
  const info = { name: "specpulse", version: packageVersion(), instructions: SERVER_INSTRUCTIONS };
  console.error(`specpulse mcp: serving ${root} (data file: ${config.dataFile})`);
  const lines = createInterface({ input: process.stdin, crlfDelay: Number.POSITIVE_INFINITY });
  for await (const line of lines) {
    const out = handleLine(line, tools, info);
    if (out !== undefined) process.stdout.write(`${out}\n`);
  }
};
