// Runs the owner's `live.check` command, one at a time. A request while it runs queues exactly one
// more run, so the result always reflects the latest files without ever running in parallel.
import { type ChildProcess, spawn } from "node:child_process";
import { type CheckState, tailLines } from "../live.ts";

const OUTPUT_LINES = 30;
const OUTPUT_BYTES = 256 * 1024;

export interface CheckRunner {
  readonly state: () => CheckState;
  readonly run: () => void;
  readonly stop: () => void;
}

export const createCheckRunner = (
  root: string,
  command: string | undefined,
  onUpdate: (s: CheckState) => void,
): CheckRunner => {
  let state: CheckState = command ? { status: "idle", command } : { status: "none" };
  let child: ChildProcess | undefined;
  let queued = false;

  const finish = (code: number, started: number, output: string): void => {
    child = undefined;
    state = {
      status: code === 0 ? "passed" : "failed",
      ...(command ? { command } : {}),
      code,
      seconds: Math.round((Date.now() - started) / 100) / 10,
      at: new Date().toISOString(),
      output: tailLines(output, OUTPUT_LINES),
    };
    onUpdate(state);
    if (queued) {
      queued = false;
      run();
    }
  };

  const run = (): void => {
    if (!command) return;
    if (child) {
      queued = true;
      return;
    }
    const started = Date.now();
    let output = "";
    const keep = (b: Buffer): void => {
      output = (output + b.toString("utf8")).slice(-OUTPUT_BYTES);
    };
    state = { ...state, status: "running", command };
    onUpdate(state);
    child = spawn(command, { cwd: root, shell: true, env: { ...process.env, FORCE_COLOR: "0" } });
    child.stdout?.on("data", keep);
    child.stderr?.on("data", keep);
    child.on("error", (e) => finish(127, started, `${output}\n${e.message}`));
    child.on("close", (code) => finish(code ?? 1, started, output));
  };

  return {
    state: () => state,
    run,
    stop: () => {
      queued = false;
      child?.kill();
    },
  };
};
