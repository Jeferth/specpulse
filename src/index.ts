// Public API: pure text → data functions plus `generate` for a full run.
export { type Args, DEFAULT_PORT, parseArgs, USAGE } from "./args.ts";
export {
  CONFIG_FILES,
  type Config,
  defaultConfig,
  type GalleryConfig,
  LOCALES,
  type Locale,
  parseConfig,
  phasePath,
  type SpecsConfig,
} from "./config.ts";
export {
  type DataFile,
  EMPTY_DATA,
  type ImageEntry,
  type MilestoneEntry,
  parseDataFile,
  STATUS_ALIASES,
  STATUSES,
  type Status,
} from "./data-file.ts";
export { type GenerateOptions, type GenerateResult, generate } from "./generate.ts";
export { type Commit, commitsFor, GIT_LOG_FORMAT, isClean, parseGitLog } from "./git-log.ts";
export {
  escapeHtml,
  type GalleryItem,
  inlineMd,
  type Page,
  type PageMeta,
  type RepoInfo,
  renderHtml,
} from "./html.ts";
export { type Strings, stringsFor } from "./i18n.ts";
export { loadConfig } from "./io/load-config.ts";
export {
  buildModel,
  type MilestoneView,
  type Model,
  type ModelInput,
  milestoneView,
  type PhaseView,
  type Source,
  type SpecView,
  statusOf,
} from "./model.ts";
export { type Milestone, type Phase, parseMilestones, parseRoadmap } from "./roadmap.ts";
export { isSpecFile, parseSpec, type Spec } from "./spec.ts";
export {
  buildTimeline,
  type Change,
  type RawSnapshot,
  readableStamp,
  type Snapshot,
  type SnapshotImage,
  stampOf,
} from "./timeline.ts";
