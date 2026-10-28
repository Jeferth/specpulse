// Finds and reads the config file. Without one, the defaults apply and the title is the project's
// package.json name (or the folder name).
import { existsSync, readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { CONFIG_FILES, type Config, defaultConfig, parseConfig } from "../config.ts";

const titleOf = (root: string): string => {
  const pkg = join(root, "package.json");
  if (existsSync(pkg)) {
    try {
      const name: unknown = JSON.parse(readFileSync(pkg, "utf8")).name;
      if (typeof name === "string" && name) return name;
    } catch {
      // A broken package.json is not ours to report; fall back to the folder name.
    }
  }
  return basename(resolve(root));
};

/** The `specpulse` key of package.json, for projects that keep tool config there. */
const fromPackageJson = (root: string, title: string): { config: Config; path: string } | undefined => {
  const pkg = join(root, "package.json");
  if (!existsSync(pkg)) return undefined;
  let raw: unknown;
  try {
    raw = (JSON.parse(readFileSync(pkg, "utf8")) as { specpulse?: unknown }).specpulse;
  } catch {
    return undefined;
  }
  if (raw === undefined) return undefined;
  const where = `${pkg}#specpulse`;
  return { config: parseConfig(raw, title, where), path: where };
};

/**
 * `explicit` resolves against the process cwd; the default names are looked up in `root`, then the
 * `specpulse` key of package.json.
 */
export const loadConfig = (root: string, explicit?: string): { config: Config; path?: string } => {
  const path = explicit
    ? resolve(explicit)
    : CONFIG_FILES.map((f) => join(root, f)).find((f) => existsSync(f));
  const title = titleOf(root);
  if (!path) return fromPackageJson(root, title) ?? { config: defaultConfig(title) };
  if (!existsSync(path)) throw new Error(`config not found: ${path}`);
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    throw new Error(`${path}: invalid JSON (${(e as Error).message})`);
  }
  return { config: parseConfig(raw, title, path), path };
};
