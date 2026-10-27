#!/usr/bin/env node
// specpulse [--cwd <dir>] [--config <path>] [--no-render] [--open] [--serve [--port N]]
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs, USAGE } from "./args.ts";
import { generate } from "./generate.ts";
import { loadConfig } from "./io/load-config.ts";
import { openInBrowser, serve } from "./io/serve.ts";

const version = (): string => {
  const pkg: unknown = JSON.parse(readFileSync(join(import.meta.dirname, "../package.json"), "utf8"));
  return (pkg as { version?: string }).version ?? "0.0.0";
};

const main = (argv: readonly string[]): void => {
  const args = parseArgs(argv);
  if (args.help) return void console.log(USAGE);
  if (args.version) return void console.log(version());
  const root = resolve(args.cwd ?? ".");
  const { config } = loadConfig(root, args.config);
  const { outDir, index } = generate({ root, config, render: args.render });
  console.log(index);
  if (args.open) openInBrowser(args.serve ? `http://localhost:${args.port}/` : pathToFileURL(index).href);
  if (args.serve) serve(outDir, args.port);
};

try {
  main(process.argv.slice(2));
} catch (e) {
  console.error(`specpulse: ${(e as Error).message}`);
  process.exitCode = 1;
}
