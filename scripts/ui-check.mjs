// Browser check of the dashboard with Playwright (not a dependency of this package: point
// PLAYWRIGHT at an installed copy, e.g. a global install). Two parts:
//   static: a generated index.html over file:// (routes, filters, keys, language, no network)
//   live:   `specpulse --serve` on a scratch copy of examples/basic (DOM updates without reload)
// Usage: node scripts/ui-check.mjs [outDirForScreenshots]
import { spawn, spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repo = resolve(import.meta.dirname, "..");
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT ?? "playwright");
const shots = process.argv[2];
let failed = 0;
const ok = (cond, what) => {
  console.log(`${cond ? "ok  " : "FAIL"} ${what}`);
  if (!cond) failed++;
};
const cli = (args, cwd) =>
  spawnSync(process.execPath, [join(repo, "src/cli.ts"), ...args], { cwd, encoding: "utf8" });

const work = mkdtempSync(join(tmpdir(), "specpulse-ui-"));
const project = join(work, "proj");
cpSync(join(repo, "examples/basic"), project, { recursive: true });
rmSync(join(project, ".cache"), { recursive: true, force: true });
writeFileSync(join(project, "specpulse.config.json"), '{"live":{"check":"node -e \\"console.log(42)\\""}}');
const git = (...a) =>
  spawnSync("git", ["-c", "user.email=ui@check", "-c", "user.name=ui", ...a], { cwd: project });
git("init", "-q");
git("add", "-A");
git("commit", "-qm", "chore: start (APP-001)");

const browser = await chromium.launch();
try {
  // ── static ──
  cli(["--no-render"], project);
  const index = pathToFileURL(join(project, ".cache/specpulse/index.html")).href;
  for (const [width, scheme] of [
    [1280, "light"],
    [1280, "dark"],
    [400, "light"],
    [400, "dark"],
  ]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, colorScheme: scheme });
    const requests = [];
    page.on("request", (r) => r.url().startsWith("file:") || requests.push(r.url()));
    for (const route of ["", "#/phases", "#/specs", "#/specs/APP-001", "#/guide"]) {
      await page.goto(index + route);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      ok(!overflow, `${width}px ${scheme} ${route || "#/overview"}: no horizontal scroll`);
      if (shots)
        await page.screenshot({
          path: join(shots, `${width}-${scheme}${route.replace(/\W+/g, "_")}.png`),
          fullPage: true,
        });
    }
    ok(requests.length === 0, `${width}px ${scheme}: no network requests`);
    await page.close();
  }
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${index}#/specs`);
  ok((await page.locator("nav a.active").getAttribute("data-view")) === "specs", "file:// deep link #/specs");
  await page.fill("#sp-filter-text", "cli");
  ok((await page.locator("tbody tr").count()) === 1, "text filter");
  ok(
    (await page.evaluate(() => document.activeElement?.id)) === "sp-filter-text",
    "focus kept while filtering",
  );
  await page.locator("tbody tr").first().click();
  ok(page.url().endsWith("#/specs/APP-002"), `row opens the spec detail URL (${page.url().slice(-20)})`);
  await page.keyboard.press("g");
  await page.keyboard.press("f");
  ok(page.url().endsWith("#/phases"), "g f → phases");
  await page.selectOption("#sp-lang", "es");
  await page.reload();
  ok((await page.locator("nav a").first().textContent()) === "Resumen", "language switch is remembered");
  ok((await page.locator("nav [data-view=live]").count()) === 0, "no Live view without --serve");
  ok(
    !readFileSync(join(project, ".cache/specpulse/index.html"), "utf8").includes('id="specpulse-live"'),
    "static file has no live data",
  );
  ok(errors.length === 0, `no page errors ${JSON.stringify(errors)}`);
  await page.close();

  // ── live ──
  const port = 21000 + Math.floor(Math.random() * 9000);
  const server = spawn(
    process.execPath,
    [join(repo, "src/cli.ts"), "--serve", "--no-render", "--port", String(port)],
    {
      cwd: project,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  await new Promise((done) => server.stdout.on("data", (d) => String(d).includes("live") && done()));
  const live = await browser.newPage();
  await live.goto(`http://localhost:${port}/#/specs/APP-001`);
  await live.waitForSelector(".live-dot.on");
  ok(true, "live indicator connected");
  await live.evaluate(() => {
    window.__marker = 1;
  });
  const spec = join(project, "docs/specs/APP-001-parser.md");
  const t0 = Date.now();
  writeFileSync(spec, readFileSync(spec, "utf8").replace("- [ ] round-trips", "- [x] round-trips"));
  await live.waitForSelector("text=3/3 criteria", { timeout: 5000 });
  ok(Date.now() - t0 < 2000, `checkbox change shown in ${Date.now() - t0} ms without reload`);
  git("commit", "-qam", "feat(parser): round-trips comments (APP-001)");
  await live.waitForSelector("text=round-trips comments", { timeout: 5000 });
  ok(true, "new commit appears in the spec and footer");
  ok((await live.evaluate(() => window.__marker)) === 1, "no navigation happened");
  await live.goto(`http://localhost:${port}/#/live`);
  await live.click("[data-action=check]");
  await live.waitForSelector(".c-passed", { timeout: 10_000 });
  ok(true, "Run check shows the result");
  ok((await live.locator(".feed li").count()) >= 2, "commit feed lists commits");
  server.kill();
  await live.waitForSelector(".live-dot.off", { timeout: 5000 });
  ok(true, "indicator shows reconnecting when the server stops");
  const again = spawn(
    process.execPath,
    [join(repo, "src/cli.ts"), "--serve", "--no-render", "--port", String(port)],
    {
      cwd: project,
      stdio: "ignore",
    },
  );
  await live.waitForSelector(".live-dot.on", { timeout: 10_000 });
  ok(true, "reconnects by itself");
  again.kill();
} finally {
  await browser.close();
  rmSync(work, { recursive: true, force: true });
}
console.log(failed ? `${failed} check(s) failed` : "all UI checks passed");
process.exitCode = failed ? 1 : 0;
