// Public API: pure text → data → HTML functions plus `generate` for a full run.
export { type Args, DEFAULT_PORT, parseArgs, USAGE } from "./args.ts";
export { bundleClient, stripModuleSyntax } from "./client-bundle.ts";
export {
  type Ctx,
  effectiveRoute,
  type Filters,
  filterSpecs,
  fmt,
  hrefOf,
  type LiveView,
  NO_FILTERS,
  parseRoute,
  type Route,
  renderApp,
  renderView,
  VIEWS,
  type ViewId,
  visibleViews,
} from "./client-views.ts";
export {
  CONFIG_FILES,
  type Config,
  defaultConfig,
  type GalleryConfig,
  ID_SOURCES,
  type IdSource,
  type LiveConfig,
  LOCALES,
  type Locale,
  parseConfig,
  phasePath,
  SPEC_FORMATS,
  type SpecFormat,
  type SpecsConfig,
} from "./config.ts";
export { type DataChange, type ImageChange, type MilestoneChange, updateDataFile } from "./data-edit.ts";
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
export { type Frontmatter, type FrontmatterValue, parseFrontmatter } from "./frontmatter.ts";
export {
  type BuildPageOptions,
  buildPage,
  type GenerateOptions,
  type GenerateResult,
  generate,
} from "./generate.ts";
export { type Commit, commitsFor, GIT_LOG_FORMAT, isClean, parseGitLog } from "./git-log.ts";
export { GUIDE, type GuideBlock, type GuideSection } from "./guide.ts";
export {
  escapeHtml,
  type GalleryItem,
  inlineMd,
  jsonForScript,
  type Page,
  type PageData,
  type PageMeta,
  type RepoInfo,
  renderHtml,
} from "./html.ts";
export { MESSAGES, type MessageKey, type Messages, messagesFor } from "./i18n.ts";
export {
  configDiff,
  configFromDetection,
  type Detection,
  detectLayout,
  type FileTree,
  inferIdPattern,
  inferSpecFormat,
} from "./init.ts";
export { clientScript } from "./io/client-script.ts";
export { loadConfig } from "./io/load-config.ts";
export {
  type Activity,
  type ChangedFile,
  type ChangedGroup,
  type CheckState,
  type CheckStatus,
  groupChanged,
  type LiveCommit,
  type LiveState,
  newCommits,
  parsePorcelain,
  type RecentFile,
  recentFiles,
  type SessionTool,
  type SessionView,
  tailLines,
} from "./live.ts";
export {
  handleLine,
  handleMessage,
  PROTOCOL_VERSIONS,
  type ServerInfo,
  type Tool,
  type ToolOutput,
} from "./mcp/protocol.ts";
export { progressTools, SERVER_INSTRUCTIONS, type Workspace } from "./mcp/tools.ts";
export {
  buildModel,
  type MilestoneView,
  type Model,
  type ModelInput,
  type ModelWarning,
  milestoneView,
  type PhaseView,
  type Source,
  type SpecView,
  statusOf,
} from "./model.ts";
export { type Milestone, type Phase, parseMilestones, parseRoadmap } from "./roadmap.ts";
export {
  type Criterion,
  criteriaOf,
  isSpecFile,
  markdownAdapter,
  parseSpec,
  type Spec,
  type SpecAdapter,
} from "./spec.ts";
export { adapterFor, isSpecCandidate, readSpec, SPEC_ADAPTERS } from "./spec-adapters.ts";
export { frontmatterAdapter, SPEC_STATUS_ALIASES, statusFromText } from "./spec-frontmatter.ts";
export {
  buildSummary,
  currentPhaseOf,
  renderSummary,
  type Summary,
  type SummaryFilter,
  type SummaryMilestone,
  type SummaryPhase,
  type SummarySpec,
  summaryText,
} from "./summary.ts";
export {
  buildTimeline,
  type Change,
  type RawSnapshot,
  readableStamp,
  type Snapshot,
  type SnapshotImage,
  stampOf,
} from "./timeline.ts";
