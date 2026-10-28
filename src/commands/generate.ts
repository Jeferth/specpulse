// Default command: build the dashboard, then optionally open it or serve it live.
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs, USAGE } from "../args.ts";
import { generate } from "../generate.ts";
import { loadConfig } from "../io/load-config.ts";
import { readCommits, readModelInput } from "../io/repo.ts";
import { openInBrowser, serveLive } from "../io/serve.ts";
import { packageVersion } from "../io/version.ts";
import { buildModel } from "../model.ts";
import { summaryText } from "../summary.ts";

export const runGenerate = (argv: readonly string[]): void => {
  const args = parseArgs(argv);
  if (args.help) return void console.log(USAGE);
  if (args.version) return void console.log(packageVersion());
  const root = resolve(args.cwd ?? ".");
  const { config } = loadConfig(root, args.config);
  if (args.summary) {
    const commits = readCommits(root, config.specs.idPattern);
    return void process.stdout.write(summaryText(buildModel(readModelInput(root, config, commits))));
  }
  const { index, page } = generate({ root, config, render: args.render });
  console.log(index);
  if (!args.serve) return void (args.open && openInBrowser(pathToFileURL(index).href));
  serveLive({
    root,
    config,
    port: args.port,
    page,
    claudeSessions: args.claudeSessions || config.live.claudeSessions,
    onListen: (url) => {
      console.log(`${url}  live (Ctrl+C to stop)`);
      if (args.open) openInBrowser(url);
    },
  });
};
