// Reads the target project: docs files and git. All interpretation lives in the pure modules.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { type Config, phasePath } from "../config.ts";
import { EMPTY_DATA, parseDataFile } from "../data-file.ts";
import { type Commit, GIT_LOG_FORMAT, isClean, parseGitLog } from "../git-log.ts";
import type { ModelInput } from "../model.ts";
import { type Milestone, parseMilestones, parseRoadmap } from "../roadmap.ts";
import type { Spec } from "../spec.ts";
import { isSpecCandidate, readSpec } from "../spec-adapters.ts";

const read = (root: string, rel: string): string => readFileSync(join(root, rel), "utf8");
const readIfExists = (root: string, rel: string): string | undefined =>
  existsSync(join(root, rel)) ? read(root, rel) : undefined;

/** Runs git in `root`; undefined when git is missing or the folder is not a repository. */
export const git = (root: string, args: readonly string[]): string | undefined => {
  const r = spawnSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return r.status === 0 ? r.stdout : undefined;
};

const readSpecs = (root: string, config: Config): Spec[] => {
  const { dir } = config.specs;
  if (!existsSync(join(root, dir))) return [];
  return readdirSync(join(root, dir))
    .filter((f) => isSpecCandidate(f, config.specs))
    .map((f) => readSpec(read(root, `${dir}/${f}`), `${dir}/${f}`, config.specs))
    .filter((s) => s !== undefined);
};

export const readModelInput = (root: string, config: Config, commits: readonly Commit[]): ModelInput => {
  const roadmap = readIfExists(root, config.roadmap);
  const phases = roadmap ? parseRoadmap(roadmap) : [];
  const milestones = new Map<number, Milestone[]>();
  for (const p of phases) {
    const md = readIfExists(root, phasePath(config, p.n));
    milestones.set(p.n, md ? parseMilestones(md) : []);
  }
  const json = readIfExists(root, config.dataFile);
  return {
    phases,
    milestones,
    specs: readSpecs(root, config),
    commits,
    data: json ? parseDataFile(json, config.dataFile) : EMPTY_DATA,
    dataFile: config.dataFile,
    phaseFile: (n) => phasePath(config, n),
  };
};

export const readCommits = (root: string, idPattern: string): Commit[] =>
  parseGitLog(git(root, ["log", `--format=${GIT_LOG_FORMAT}`]) ?? "", idPattern);

export const readRepoState = (root: string): { branch: string; clean: boolean } => {
  const status = git(root, ["status", "--porcelain"]);
  return {
    branch: git(root, ["rev-parse", "--abbrev-ref", "HEAD"])?.trim() ?? "—",
    clean: status === undefined ? true : isClean(status),
  };
};
