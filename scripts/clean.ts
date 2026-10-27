// Removes dist/ before a build so deleted sources never linger in the published package.
import { rmSync } from "node:fs";
import { resolve } from "node:path";

rmSync(resolve(import.meta.dirname, "../dist"), { recursive: true, force: true });
