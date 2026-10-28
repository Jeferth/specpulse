// `specpulse init`: writes specpulse.config.json (only what differs from the defaults) and an
// empty data file, guessed from the files already in the project. Never overwrites anything.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { CONFIG_FILES, type Config, LOCALES, type Locale } from "../config.ts";
import {
  configDiff,
  configFileText,
  configFromDetection,
  detectLayout,
  emptyDataFileText,
  isIgnored,
} from "../init.ts";
import { loadConfig } from "../io/load-config.ts";

export const INIT_USAGE = `Usage: specpulse init [options]

Writes specpulse.config.json (only the settings that differ from the defaults) and an empty data
file, guessed from the roadmap, phase folders and specs already in the project. Existing files are
never overwritten.

Options:
  --cwd <dir>        project root (default: current directory)
  --locale <locale>  dashboard language: ${LOCALES.join(", ")} (default: guessed, else en)
  -h, --help         print this help`;

export interface InitOptions {
  readonly locale?: Locale;
}

export interface InitReport {
  /** Files written, relative to the root. */
  readonly created: readonly string[];
  /** Files left alone because they already existed. */
  readonly skipped: readonly string[];
  readonly config: Config;
  /** Settings written to the new config (empty when the config already existed or matches defaults). */
  readonly written: Readonly<Record<string, unknown>>;
  /** Whether .gitignore already covers the output folder. */
  readonly outDirIgnored: boolean;
}

// Folders that never hold specs and can be huge; walking them would only slow init down.
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", "coverage", ".cache", ".next", "target"]);
const MAX_FILES = 20_000;
const HEAD_BYTES = 64;

const listFiles = (root: string): string[] => {
  const out: string[] = [];
  const walk = (rel: string): void => {
    for (const e of readdirSync(join(root, rel), { withFileTypes: true })) {
      if (out.length >= MAX_FILES) return;
      const path = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory() && !SKIP_DIRS.has(e.name)) walk(path);
      else if (e.isFile()) out.push(path);
    }
  };
  walk("");
  return out;
};

const head = (root: string, rel: string): string =>
  readFileSync(join(root, rel), "utf8").slice(0, HEAD_BYTES);

const writeNew = (root: string, rel: string, text: string): void => {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  // "wx" fails instead of overwriting if the file appeared in the meantime.
  writeFileSync(join(root, rel), text, { flag: "wx" });
};

const readGitignore = (root: string): string => {
  const p = join(root, ".gitignore");
  return existsSync(p) ? readFileSync(p, "utf8") : "";
};

/** Does the work of `specpulse init` in `root` and reports it; prints nothing. */
export const initProject = (root: string, options: InitOptions = {}): InitReport => {
  const created: string[] = [];
  const skipped: string[] = [];
  const existing = CONFIG_FILES.find((f) => existsSync(join(root, f)));
  let config: Config;
  let written: Record<string, unknown> = {};
  if (existing) {
    skipped.push(existing);
    config = loadConfig(root).config;
  } else {
    const title = basename(resolve(root));
    const paths = listFiles(root);
    const first = detectLayout({ paths });
    const heads = Object.fromEntries(first.specFiles.map((f) => [f, head(root, f)]));
    config = configFromDetection(detectLayout({ paths, heads }), title, options.locale);
    written = configDiff(config, title);
    writeNew(root, CONFIG_FILES[0], configFileText(config, title));
    created.push(CONFIG_FILES[0]);
  }
  if (existsSync(join(root, config.dataFile))) skipped.push(config.dataFile);
  else {
    writeNew(root, config.dataFile, emptyDataFileText(config.dataFile));
    created.push(config.dataFile);
  }
  return { created, skipped, config, written, outDirIgnored: isIgnored(readGitignore(root), config.outDir) };
};

const collectInitArgs = (argv: readonly string[]): { help: boolean; values: Map<string, string> } => {
  const values = new Map<string, string>();
  let help = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i] ?? "";
    if (a === "--help" || a === "-h") help = true;
    else if (a === "--cwd" || a === "--locale") {
      const v = argv[++i];
      if (v === undefined || v.startsWith("--")) throw new Error(`${a} needs a value`);
      values.set(a, v);
    } else throw new Error(`unknown option "${a}" (see specpulse init --help)`);
  }
  return { help, values };
};

const localeOf = (raw: string | undefined): Locale | undefined => {
  if (raw === undefined) return undefined;
  if (!LOCALES.includes(raw as Locale))
    throw new Error(`--locale must be one of: ${LOCALES.join(", ")} (got "${raw}")`);
  return raw as Locale;
};

const parseInitArgs = (argv: readonly string[]): { cwd?: string; locale?: Locale; help: boolean } => {
  const { help, values } = collectInitArgs(argv);
  const cwd = values.get("--cwd");
  const locale = localeOf(values.get("--locale"));
  return { help, ...(cwd === undefined ? {} : { cwd }), ...(locale === undefined ? {} : { locale }) };
};

const printReport = (r: InitReport): void => {
  for (const f of r.created) console.log(`created  ${f}`);
  for (const f of r.skipped) console.log(`skipped  ${f} (already exists, left untouched)`);
  const keys = Object.keys(r.written);
  if (r.created.includes(CONFIG_FILES[0]))
    console.log(keys.length ? `settings: ${keys.join(", ")}` : "settings: all defaults");
  if (!r.outDirIgnored) console.log(`hint: add "${r.config.outDir}/" to .gitignore (generated output)`);
  console.log("next:    npx specpulse --open");
};

export const runInit = (argv: readonly string[]): void => {
  const args = parseInitArgs(argv);
  if (args.help) return void console.log(INIT_USAGE);
  const root = resolve(args.cwd ?? ".");
  if (!existsSync(root)) throw new Error(`folder not found: ${root}`);
  printReport(initProject(root, args.locale ? { locale: args.locale } : {}));
};
