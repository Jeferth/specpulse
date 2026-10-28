// Pure parts of `specpulse skill install`: arguments and where the skill goes.
export type SkillScope = "project" | "user";

export interface SkillArgs {
  readonly help: boolean;
  readonly scope: SkillScope;
  readonly force: boolean;
  readonly cwd?: string;
}

export const SKILL_USAGE = `Usage: specpulse skill install [--project | --user] [--force] [--cwd <dir>]

Copies the specpulse skill (SKILL.md) for Claude Code:
  --project   into <project>/.claude/skills/specpulse/ (default)
  --user      into ~/.claude/skills/specpulse/
  --force     overwrite an existing SKILL.md
  --cwd <dir> project root (default: current directory)`;

/** Skill folder relative to the project root (--project) or the home directory (--user). */
export const SKILL_DIR = ".claude/skills/specpulse";

const readOptions = (rest: readonly string[]) => {
  const flags = new Set<string>();
  let cwd: string | undefined;
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i] ?? "";
    if (["--project", "--user", "--force", "--help", "-h"].includes(a)) flags.add(a);
    else if (a === "--cwd") {
      cwd = rest[++i];
      if (cwd === undefined || cwd.startsWith("--")) throw new Error("--cwd needs a value");
    } else throw new Error(`unknown option "${a}" for \`specpulse skill install\``);
  }
  return { flags, cwd };
};

export const parseSkillArgs = (argv: readonly string[]): SkillArgs => {
  const [sub, ...rest] = argv;
  if (sub === undefined || sub === "--help" || sub === "-h")
    return { help: true, scope: "project", force: false };
  if (sub !== "install") throw new Error(`unknown subcommand "skill ${sub}" (try: specpulse skill install)`);
  const { flags, cwd } = readOptions(rest);
  if (flags.has("--project") && flags.has("--user"))
    throw new Error("use either --project or --user, not both");
  return {
    help: flags.has("--help") || flags.has("-h"),
    scope: flags.has("--user") ? "user" : "project",
    force: flags.has("--force"),
    ...(cwd === undefined ? {} : { cwd }),
  };
};
