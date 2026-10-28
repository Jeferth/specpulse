// Default command: build the dashboard, then optionally open and/or serve it.

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs, USAGE } from "../args.ts";
import { generate } from "../generate.ts";
import { loadConfig } from "../io/load-config.ts";
import { openInBrowser, serve } from "../io/serve.ts";
import { packageVersion } from "../io/version.ts";

export const runGenerate = (argv: readonly string[]): void => {
  const args = parseArgs(argv);
  if (args.help) return void console.log(USAGE);
  if (args.version) return void console.log(packageVersion());
  const root = resolve(args.cwd ?? ".");
  const { config } = loadConfig(root, args.config);
  const { outDir, index } = generate({ root, config, render: args.render });
  console.log(index);
  if (args.open) openInBrowser(args.serve ? `http://localhost:${args.port}/` : pathToFileURL(index).href);
  if (args.serve) serve(outDir, args.port);
};
