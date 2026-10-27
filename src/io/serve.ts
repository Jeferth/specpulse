// Local static server (node:http only, bound to 127.0.0.1) and opening the default browser.
import { spawn } from "node:child_process";
import { readFile } from "node:fs";
import { createServer, type Server } from "node:http";
import { extname, join, normalize, sep } from "node:path";

const types: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".png": "image/png",
  ".json": "application/json",
};

export const serve = (dir: string, port: number): Server => {
  const root = normalize(dir + sep);
  return createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname);
    const file = normalize(join(root, path === "/" ? "index.html" : path));
    // Nothing outside the output folder is ever served.
    if (!file.startsWith(root)) return void res.writeHead(403).end();
    readFile(file, (e, data) => {
      if (e) return void res.writeHead(404).end("not found");
      res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" }).end(data);
    });
  }).listen(port, "127.0.0.1", () => console.log(`http://localhost:${port}/  (Ctrl+C to stop)`));
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
