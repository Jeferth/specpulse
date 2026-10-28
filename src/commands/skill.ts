// `specpulse skill install`: copies the bundled Claude Code skill into the project or the user's home.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { parseSkillArgs, SKILL_DIR, SKILL_USAGE, type SkillScope } from "../skill-install.ts";

/** Same relative path from src/commands (dev) and dist/commands (published package). */
export const BUNDLED_SKILL = join(import.meta.dirname, "../../skills/specpulse/SKILL.md");

export interface InstallOptions {
  readonly scope: SkillScope;
  readonly force: boolean;
  /** Project root, for --project. */
  readonly cwd: string;
  /** Home directory, for --user; injectable so tests never touch the real one. */
  readonly home?: string;
  readonly source?: string;
}

/** Returns the installed SKILL.md path. */
export const installSkill = (o: InstallOptions): string => {
  const base = o.scope === "user" ? (o.home ?? homedir()) : o.cwd;
  const dir = join(base, SKILL_DIR);
  const target = join(dir, "SKILL.md");
  const source = o.source ?? BUNDLED_SKILL;
  if (!existsSync(source)) throw new Error(`bundled skill not found: ${source}`);
  if (existsSync(target) && !o.force)
    throw new Error(`${target} already exists; pass --force to overwrite it`);
  mkdirSync(dir, { recursive: true });
  copyFileSync(source, target);
  return target;
};

export const runSkill = (argv: readonly string[]): void => {
  const args = parseSkillArgs(argv);
  if (args.help) return void console.log(SKILL_USAGE);
  const target = installSkill({ scope: args.scope, force: args.force, cwd: resolve(args.cwd ?? ".") });
  console.log(target);
};
