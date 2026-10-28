// `specpulse --serve`: a local server (node:http, 127.0.0.1 only) that keeps the dashboard live.
// It watches the inputs, rebuilds the page data on change and pushes it over Server-Sent Events;
// the Live view state (git, check, opt-in Claude Code sessions) is refreshed on a short interval.
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFile, writeFileSync } from "node:fs";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { homedir } from "node:os";
import { extname, join, normalize, resolve, sep } from "node:path";
import type { Config } from "../config.ts";
import { batcher } from "../debounce.ts";
import { buildPage, generate } from "../generate.ts";
import { jsonForScript, LIVE_SLOT, type Page, renderHtml } from "../html.ts";
import { activityOf, type LiveCommit, type LiveState } from "../live.ts";
import { isRelevant, watchedPaths } from "../watch-paths.ts";
import { createCheckRunner } from "./check.ts";
import { clientScript } from "./client-script.ts";
import { collectLive } from "./live-state.ts";
import { watchProject } from "./watch.ts";

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".json": "application/json",
};

const DEBOUNCE_MS = 300;
const LIVE_MS = 2000;
const CHECK_DEBOUNCE_MS = 3000;
const KEEPALIVE_MS = 15_000;

export interface LiveServerOptions {
  readonly root: string;
  readonly config: Config;
  readonly port: number;
  /** Page from the initial build (its gallery is reused on rebuilds). */
  readonly page: Page;
  readonly claudeSessions: boolean;
  /** Home folder for ~/.claude; injectable for tests. */
  readonly home?: string;
  /** Called once the server listens. */
  readonly onListen?: (url: string) => void;
}

export interface LiveServer {
  readonly server: Server;
  readonly token: string;
  readonly close: () => Promise<void>;
}

/** Only our own origin may talk to the server (stops DNS-rebinding pages from reading it). */
export const allowedHost = (host: string | undefined, port: number): boolean =>
  host === `localhost:${port}` || host === `127.0.0.1:${port}` || host === `[::1]:${port}`;

const sse = (event: string, data: unknown): string => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

interface Hub {
  readonly clients: Set<ServerResponse>;
  readonly send: (event: string, data: unknown) => void;
}

const createHub = (): Hub => {
  const clients = new Set<ServerResponse>();
  return {
    clients,
    send: (event, data) => {
      const msg = sse(event, data);
      for (const c of clients) c.write(msg);
    },
  };
};

const sendFile = (res: ServerResponse, file: string, transform?: (html: string) => string): void => {
  readFile(file, (e, data) => {
    if (e) return void res.writeHead(404).end("not found");
    const type = TYPES[extname(file).toLowerCase()] ?? "application/octet-stream";
    const body = transform ? transform(data.toString("utf8")) : data;
    res.writeHead(200, { "content-type": type, "cache-control": "no-store" }).end(body);
  });
};

export const serveLive = (o: LiveServerOptions): LiveServer => {
  const { root, config, port } = o;
  const outDir = resolve(root, config.outDir);
  const token = randomBytes(16).toString("hex");
  const hub = createHub();
  const home = o.home ?? homedir();
  let page = o.page;
  let live: LiveState | undefined;
  let lastCommits: readonly LiveCommit[] = [];
  let rendering = false;

  const writeIndex = (): void => writeFileSync(join(outDir, "index.html"), renderHtml(page, clientScript()));

  const refreshLive = (): void => {
    const next = collectLive(
      {
        root,
        idPattern: config.specs.idPattern,
        commits: config.live.commits,
        claudeSessions: o.claudeSessions,
        home,
        now: Date.now(),
      },
      check.state(),
    );
    const fresh = activityOf([], lastCommits, next.commits);
    lastCommits = next.commits;
    if (JSON.stringify(next) === JSON.stringify(live)) return;
    live = next;
    hub.send("live", live);
    if (fresh.newCommits.length) hub.send("activity", fresh);
  };

  const check = createCheckRunner(root, config.live.check, () => refreshLive());
  const checkSoon = batcher<string>(CHECK_DEBOUNCE_MS, () => check.run(), {
    set: setTimeout,
    clear: (h) => clearTimeout(h as NodeJS.Timeout),
  });

  const rebuild = (files: string[]): void => {
    try {
      const next = buildPage({ root, config, render: false, keepGallery: page.gallery });
      const changed =
        JSON.stringify(next.model) !== JSON.stringify(page.model) ||
        next.repo.lastCommit?.hash !== page.repo.lastCommit?.hash;
      page = { ...next, repo: { ...next.repo, rendered: page.repo.rendered } };
      writeIndex();
      hub.send("model", page);
      hub.send("activity", activityOf(files, [], []));
      if (changed && config.live.checkOnChange) checkSoon.push("change");
    } catch (e) {
      // A half-saved file is normal while someone types; keep the last good page.
      console.warn(`specpulse: rebuild skipped (${(e as Error).message})`);
    }
    refreshLive();
  };

  const changes = batcher<string>(DEBOUNCE_MS, rebuild, {
    set: setTimeout,
    clear: (h) => clearTimeout(h as NodeJS.Timeout),
  });
  const stopWatching = watchProject({
    root,
    entries: watchedPaths(
      config,
      page.model.phases.map((p) => p.n),
    ),
    onChange: (rel) => {
      if (isRelevant(rel, config.outDir)) changes.push(rel);
    },
  });

  const renderNow = (res: ServerResponse): void => {
    if (rendering) return void res.writeHead(409).end("a render is already running");
    rendering = true;
    res.writeHead(202).end("rendering");
    setImmediate(() => {
      try {
        page = generate({ root, config, render: true }).page;
        hub.send("model", page);
      } catch (e) {
        hub.send("render-error", { error: (e as Error).message });
      } finally {
        rendering = false;
      }
    });
  };

  const post = (req: IncomingMessage, res: ServerResponse, path: string): void => {
    if (req.headers["x-specpulse-token"] !== token) return void res.writeHead(403).end("forbidden");
    if (path === "/render") {
      if (!config.gallery?.render) return void res.writeHead(400).end("no gallery.render command configured");
      return void renderNow(res);
    }
    if (path === "/check") {
      if (!config.live.check) return void res.writeHead(400).end('no "live.check" command configured');
      check.run();
      return void res.writeHead(202).end("checking");
    }
    res.writeHead(404).end("not found");
  };

  const events = (req: IncomingMessage, res: ServerResponse): void => {
    res.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-store",
      connection: "keep-alive",
    });
    res.write("retry: 1000\n\n");
    res.write(sse("model", page));
    if (live) res.write(sse("live", live));
    hub.clients.add(res);
    req.on("close", () => hub.clients.delete(res));
  };

  const liveSlot = `<script type="application/json" id="specpulse-live">${jsonForScript({ token })}</script>`;
  const staticRoot = normalize(outDir + sep);

  const get = (res: ServerResponse, path: string, req: IncomingMessage): void => {
    if (path === "/events") return void events(req, res);
    if (path === "/model.json")
      return void res.writeHead(200, { "content-type": TYPES[".json"] ?? "" }).end(JSON.stringify(page));
    if (path === "/live.json")
      return void res
        .writeHead(200, { "content-type": TYPES[".json"] ?? "" })
        .end(JSON.stringify(live ?? null));
    if (path === "/" || path === "/index.html")
      return void sendFile(res, join(outDir, "index.html"), (html) => html.replace(LIVE_SLOT, liveSlot));
    const file = normalize(join(staticRoot, path));
    // Nothing outside the output folder is ever served.
    if (!file.startsWith(staticRoot)) return void res.writeHead(403).end();
    sendFile(res, file);
  };

  const server = createServer((req, res) => {
    if (!allowedHost(req.headers.host, port)) return void res.writeHead(403).end("forbidden host");
    let path: string;
    try {
      path = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname);
    } catch {
      return void res.writeHead(400).end();
    }
    if (req.method === "POST") return post(req, res, path);
    if (req.method === "GET" || req.method === "HEAD") return get(res, path, req);
    res.writeHead(405).end();
  });

  const tick = setInterval(refreshLive, LIVE_MS);
  const keepalive = setInterval(() => {
    for (const c of hub.clients) c.write(": keepalive\n\n");
  }, KEEPALIVE_MS);
  server.on("error", (e: NodeJS.ErrnoException) => {
    const why = e.code === "EADDRINUSE" ? `port ${port} is in use (try --port <n>)` : e.message;
    console.error(`specpulse: ${why}`);
    process.exitCode = 1;
  });
  server.listen(port, "127.0.0.1", () => {
    writeIndex();
    refreshLive();
    o.onListen?.(`http://localhost:${port}/`);
  });

  const close = (): Promise<void> =>
    new Promise((done) => {
      clearInterval(tick);
      clearInterval(keepalive);
      changes.cancel();
      checkSoon.cancel();
      check.stop();
      stopWatching();
      for (const c of hub.clients) c.end();
      server.close(() => done());
    });

  return { server, token, close };
};

export const openInBrowser = (target: string): void => {
  const [cmd, args] =
    process.platform === "win32"
      ? ["cmd", ["/c", "start", '""', `"${target}"`]]
      : [process.platform === "darwin" ? "open" : "xdg-open", [target]];
  spawn(cmd as string, args as string[], {
    detached: true,
    stdio: "ignore",
    windowsVerbatimArguments: true,
  }).unref();
};
