# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Until `1.0.0`, minor
versions may change the CLI, the config format and the data file format.

## [Unreleased]

## [0.1.0] - 2026-10-28

### Added

- Self-contained progress dashboard: a single `index.html` with no network access (no CDN,
  external fonts or `fetch`), showing phases, milestones, specs with acceptance checkboxes, the
  commits that cite each spec, a reference image gallery and a render timeline.
- Multi-view dashboard with hash routes: overview, phases, specs, gallery, timeline, live and
  guide.
- `specpulse` CLI: `--cwd`, `--config`, `--open`, `--serve`, `--port`, `--no-render`,
  `--summary`, `--claude-sessions`, `--version`, `--help`.
- Live mode: `--serve` watches the project and pushes updates to open dashboards over SSE
  (bound to `127.0.0.1`).
- Live view: recent commits, changed files, an optional check command and, opt-in, local
  Claude Code session metadata.
- `specpulse.config.json` (or a `specpulse` key in `package.json`) with defaults for every field, unknown keys rejected, and JSON Schemas
  for the config and the data file shipped in `schema/`.
- Data file in English or Portuguese keys and status values.
- Spec format adapters: plain markdown, frontmatter or auto-detection, configurable acceptance
  heading and ID source.
- Dashboard text in English, Brazilian Portuguese and Spanish (`en`, `pt-BR`, `es`), switchable
  in the header, and an in-dashboard Guide (tutorial) in the three languages.
- `specpulse init`: writes a config and an empty data file guessed from the project layout,
  never overwriting existing files.
- `specpulse mcp`: MCP server over stdio to read progress and update the data file, with no SDK
  dependency.
- `specpulse skill install`: installs the bundled Claude Code skill.
- Programmatic API with named exports (`generate`, `loadConfig`, `buildModel`, the parsers, …).
- Zero runtime dependencies; requires Node.js 22.18 or newer.
