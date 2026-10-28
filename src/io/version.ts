// Version of the installed package, read from its own package.json.
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const packageVersion = (): string => {
  const pkg: unknown = JSON.parse(readFileSync(join(import.meta.dirname, "../../package.json"), "utf8"));
  return (pkg as { version?: string }).version ?? "0.0.0";
};
