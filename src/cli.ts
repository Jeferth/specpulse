#!/usr/bin/env node
// specpulse [command] [options]. Without a command it builds the dashboard (see --help).
import { runGenerate } from "./commands/generate.ts";
import { runInit } from "./commands/init.ts";
import { runMcp } from "./commands/mcp.ts";
import { runSkill } from "./commands/skill.ts";

type Command = (argv: readonly string[]) => void | Promise<void>;

const COMMANDS: Readonly<Record<string, Command>> = { init: runInit, mcp: runMcp, skill: runSkill };

const main = async (argv: readonly string[]): Promise<void> => {
  const [first = "", ...rest] = argv;
  const command = COMMANDS[first];
  await (command ? command(rest) : runGenerate(argv));
};

main(process.argv.slice(2)).catch((e: unknown) => {
  console.error(`specpulse: ${(e as Error).message}`);
  process.exitCode = 1;
});
