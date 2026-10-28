// Reads the client modules next to this package and bundles them. The published package has
// compiled .js files; a source checkout (pnpm dev, Vitest) has .ts files, whose types Node strips.
import { existsSync, readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { join } from "node:path";
import { bundleClient } from "../client-bundle.ts";

const FILES = ["client-views", "client-app"] as const;

let cached: string | undefined;

const source = (dir: string, name: string): string => {
  const js = join(dir, `${name}.js`);
  if (existsSync(js)) return readFileSync(js, "utf8");
  return stripTypeScriptTypes(readFileSync(join(dir, `${name}.ts`), "utf8"));
};

export const clientScript = (): string => {
  if (cached === undefined) {
    const dir = join(import.meta.dirname, "..");
    cached = bundleClient(
      FILES.map((f) => source(dir, f)),
      "boot",
    );
  }
  return cached;
};
