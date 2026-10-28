// Packs the package exactly as npm would publish it, installs the tarball into a throwaway
// project and runs the installed bin. Catches what unit tests cannot: a missing file in `files`,
// a broken shebang or bin path, imports that only resolve inside the repo.
// Usage: pnpm build && node scripts/pack-test.ts   (KEEP_PACK_TEST=1 keeps the temp folder)
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const repo = resolve(import.meta.dirname, "..");
const pkg = JSON.parse(readFileSync(join(repo, "package.json"), "utf8")) as {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
};

const log = (msg: string): void => void process.stdout.write(`pack-test: ${msg}\n`);
const fail = (msg: string): never => {
  throw new Error(msg);
};

// Double quotes work in both sh and cmd; a shell is needed on Windows to run npm.cmd / npx.cmd.
const q = (path: string): string => `"${path}"`;

const run = (command: string, cwd: string): string => {
  const r = spawnSync(command, { cwd, shell: true, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0)
    fail(`\`${command}\` failed (exit ${r.status ?? "signal"}):\n${(r.stderr || r.stdout).trim()}`);
  return r.stdout;
};

const ALLOWED_ROOT_FILES = ["package.json", "README.md", "LICENSE", "docs/assets/screenshot.png"];
const ALLOWED_DIRS = ["dist/", "schema/", "skills/"];

const requiredFiles = (): string[] => {
  const required = [
    ...ALLOWED_ROOT_FILES,
    "dist/cli.js",
    "dist/index.js",
    "dist/index.d.ts",
    "schema/config.schema.json",
    "schema/data.schema.json",
  ];
  // The skill ships once it exists in the repo; from then on losing it from the tarball is a bug.
  if (existsSync(join(repo, "skills/specpulse/SKILL.md"))) required.push("skills/specpulse/SKILL.md");
  return required;
};

const checkFileList = (): void => {
  const [report] = JSON.parse(run("npm pack --dry-run --json", repo)) as { files: { path: string }[] }[];
  const files = (report?.files ?? []).map((f) => f.path.replaceAll("\\", "/"));
  const unexpected = files.filter(
    (f) => !ALLOWED_ROOT_FILES.includes(f) && !ALLOWED_DIRS.some((d) => f.startsWith(d)),
  );
  if (unexpected.length) fail(`unexpected files in the tarball: ${unexpected.join(", ")}`);
  const missing = requiredFiles().filter((f) => !files.includes(f));
  if (missing.length) fail(`missing from the tarball: ${missing.join(", ")}`);
  if (files.some((f) => f.endsWith(".test.js") || f.startsWith("dist/testing/")))
    fail("test files leaked into dist/");
  log(`tarball has ${files.length} files, all under ${[...ALLOWED_ROOT_FILES, ...ALLOWED_DIRS].join(" ")}`);
};

const pack = (dest: string): string => {
  const [report] = JSON.parse(run(`npm pack --json --pack-destination ${q(dest)}`, repo)) as {
    filename: string;
  }[];
  const tgz = join(dest, report?.filename ?? fail("npm pack printed no file name"));
  if (!existsSync(tgz)) fail(`npm pack did not write ${tgz}`);
  log(`packed ${tgz}`);
  return tgz;
};

const install = (app: string, tgz: string): void => {
  writeFileSync(
    join(app, "package.json"),
    '{ "name": "pack-test-app", "private": true, "type": "module" }\n',
  );
  // Zero runtime dependencies, so installing the tarball needs no registry access.
  run(`npm install --no-audit --no-fund --no-package-lock ${q(tgz)}`, app);
  log("installed the tarball into a fresh project");
};

const checkVersion = (app: string): void => {
  const out = run("npx --no -- specpulse --version", app).trim();
  if (out !== pkg.version) fail(`specpulse --version printed "${out}", expected "${pkg.version}"`);
  log(`specpulse --version → ${out}`);
};

const checkGenerate = (app: string, project: string): void => {
  cpSync(join(repo, "examples/basic"), project, {
    recursive: true,
    filter: (src) => !src.replaceAll("\\", "/").includes("/.cache"),
  });
  run(`npx --no -- specpulse --cwd ${q(project)} --no-render`, app);
  const index = join(project, ".cache/specpulse/index.html");
  if (!existsSync(index)) fail(`generation did not write ${index}`);
  const html = readFileSync(index, "utf8");
  if (!/^<!doctype html>/i.test(html.trimStart())) fail(`${index} is not an HTML page`);
  log(`generated ${index} (${html.length} bytes)`);
};

const checkApi = (app: string): void => {
  const probe = join(app, "probe.mjs");
  writeFileSync(
    probe,
    [
      'import * as api from "specpulse";',
      'import { createRequire } from "node:module";',
      'const meta = createRequire(import.meta.url)("specpulse/package.json");',
      'for (const name of ["generate", "loadConfig", "buildModel"])',
      '  if (typeof api[name] !== "function") throw new Error("export " + name + " missing");',
      "process.stdout.write(meta.version);",
    ].join("\n"),
  );
  const version = run(`node ${q(probe)}`, app).trim();
  if (version !== pkg.version) fail(`specpulse/package.json reports "${version}"`);
  log("named exports and ./package.json resolve from the installed package");
};

const main = (): void => {
  if (!existsSync(join(repo, "dist/cli.js")))
    fail("dist/cli.js not found: run `pnpm build` first (this script tests the built package)");
  if (Object.keys(pkg.dependencies ?? {}).length)
    fail(`runtime dependencies are not allowed: ${Object.keys(pkg.dependencies ?? {}).join(", ")}`);
  const tmp = mkdtempSync(join(tmpdir(), "specpulse-pack-"));
  try {
    checkFileList();
    const tgz = pack(tmp);
    const app = join(tmp, "app");
    mkdirSync(app);
    install(app, tgz);
    checkVersion(app);
    checkGenerate(app, join(tmp, "project"));
    checkApi(app);
    log(`ok: ${pkg.name}@${pkg.version}`);
  } finally {
    if (process.env["KEEP_PACK_TEST"]) log(`kept ${tmp}`);
    else rmSync(tmp, { recursive: true, force: true });
  }
};

try {
  main();
} catch (e) {
  console.error(`pack-test: ${(e as Error).message}`);
  process.exitCode = 1;
}
