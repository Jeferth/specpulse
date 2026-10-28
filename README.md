# specpulse

A local, self-contained progress dashboard for spec-driven projects.

specpulse reads what is already in your repository (a roadmap table, per-phase milestone tables,
one markdown file per spec with acceptance checkboxes, your git history and, optionally, a folder
of reference images) and writes a single `index.html` that shows where the project stands. No
account and no network: the page has no external assets and works from `file://`. Run it with
`--serve` and it updates live while you (or your AI agents) work.

It fits any JavaScript project, frontend or backend, app, library or monorepo: it only reads
markdown, JSON and git, never imports your code and has **zero runtime dependencies**. Nothing in
your build, framework or tooling changes.

![specpulse dashboard for the basic example](https://cdn.jsdelivr.net/npm/specpulse/docs/assets/screenshot.png)

## Status: pre-release

[`specpulse` on npm](https://www.npmjs.com/package/specpulse), currently `0.1.0`, the first public
release. The CLI, the config format and the data file format may still change before `1.0.0`. See
[`CHANGELOG.md`](CHANGELOG.md).

## Install

Requires Node.js 22.18 or newer. Install it as a dev dependency of your project:

```sh
npm i -D specpulse
pnpm add -D specpulse
yarn add -D specpulse
bun add -d specpulse
```

Or try it without installing, from the project root:

```sh
npx specpulse init
npx specpulse --open
```

Add scripts so the whole team runs it the same way, and keep the output out of git:

```json
{
  "scripts": {
    "progress": "specpulse --open",
    "progress:live": "specpulse --serve --open"
  }
}
```

```gitignore
.cache/specpulse/
```

## Getting started: `specpulse init`

Run `npx specpulse init` in your project root. It looks at what is already there and writes a
starting config:

- finds the roadmap (`docs/roadmap.md`, `ROADMAP.md`, …), phase files (`docs/phase-1/README.md`,
  `docs/fase-1/README.md`, `phases/1/README.md`, …) and the spec folder (`docs/specs`,
  `docs/specs/features`, `specs`, …);
- infers the spec ID pattern from file names (`F-0001-*.md` → `F-\d{4}`, `APP-001-*.md` →
  `APP-\d{3}`, several prefixes → `[A-Z]+-\d{3,}`) and detects frontmatter specs;
- writes `specpulse.config.json` with **only the settings that differ from the defaults**, plus an
  empty data file (`docs/progress.json`, or `progresso.json`/`progreso.json` for `pt-BR`/`es`) if
  there is none.

It never overwrites an existing config or data file; it prints what it created, what it skipped
and the next command. If the output folder is not in `.gitignore`, it suggests adding it (it does
not edit the file).

```sh
npx specpulse init [--cwd <dir>] [--locale en|pt-BR|es]
npx specpulse --open
```

No config at all is fine too: the defaults below apply.

## The dashboard

One page, several views (hash routes, so links and bookmarks work even from `file://`):

| View                 | Route                        | What it shows                                                                    |
| -------------------- | ---------------------------- | -------------------------------------------------------------------------------- |
| Overview             | `#/overview`                 | KPIs, progress per phase, current phase, recently touched specs, pending images. |
| Phases               | `#/phases`, `#/phases/1`     | Milestones with status, progress and the **source** of every status.             |
| Specs                | `#/specs`, `#/specs/APP-001` | Table with text/status/milestone filters; one page per spec (criteria, commits). |
| Gallery and Timeline | `#/gallery`, `#/timeline`    | Reference images next to fresh renders, and one snapshot per run (optional).     |
| Live                 | `#/live`                     | Only with `--serve`: commits, changed files, your check command, agent activity. |
| Guide                | `#/guide`                    | A tutorial in English, Portuguese and Spanish, plus the effective config.        |

Views without data (no gallery configured, no `--serve`) are hidden. The header switches the
language (`en`, `pt-BR`, `es`) and the light/dark theme; both choices are remembered in the
browser. Keyboard: `g` then `o` overview, `f` phases, `s` specs, `g` gallery, `t` timeline,
`l` live, `h` guide.

## Usage

```sh
specpulse                       # writes .cache/specpulse/index.html and prints its path
specpulse --open                # ...and opens it in the default browser
specpulse --serve --open        # live dashboard on http://localhost:4870 (127.0.0.1 only)
specpulse --summary             # plain-text summary for agents and CI logs (writes nothing)
specpulse --no-render           # skips the gallery render command
specpulse --cwd ../app --config ./app.specpulse.json
specpulse init                  # see above
specpulse skill install         # Claude Code skill (see below)
specpulse mcp                   # MCP server over stdio (see below)
```

| Option              | Meaning                                                                          |
| ------------------- | -------------------------------------------------------------------------------- |
| `--cwd <dir>`       | Project root (default: current directory).                                       |
| `--config <path>`   | Config file (default: `specpulse.config.json`, `.specpulse.json`, package.json). |
| `--no-render`       | Do not run `gallery.render`.                                                     |
| `--summary`         | Print a plain-text progress summary instead of writing the dashboard.            |
| `--open`            | Open the dashboard in the default browser.                                       |
| `--serve`           | Serve it live on `127.0.0.1` (watch + Server-Sent Events).                       |
| `--port <n>`        | Port for `--serve` (default `4870`).                                             |
| `--claude-sessions` | With `--serve`: show metadata of local Claude Code sessions (opt-in).            |
| `-v`, `--version`   | Print the version.                                                               |
| `-h`, `--help`      | Print the help (`specpulse <command> --help` for a command).                     |

## What it reads

With the defaults, a project looks like this (see [`examples/basic`](examples/basic)):

```
docs/
  roadmap.md            phase table
  phase-1/README.md     milestone table of phase 1
  specs/APP-001-x.md    one spec per file, acceptance criteria as checkboxes
  progress.json         data file (what cannot be derived)
```

**Roadmap.** Every table row whose first cell is a numeric link is a phase:

```md
| Phase                  | Name     | How to test                          | Focus          |
| ---------------------- | -------- | ------------------------------------ | -------------- |
| [1](phase-1/README.md) | **Core** | `app parse file.txt` prints the tree | Parser and CLI |
```

**Phase file.** Every table row whose first cell is `**N.M Name**` is a milestone; the second cell
is the delivery:

```md
| **1.1 Parser** | `parse()` reads every sample file |
```

**Specs.** Files in `specs.dir` whose name starts with an ID matching `specs.idPattern`. The first
heading `# <ID> · Title` (or `:` / `-`) names it; every `- [ ]` / `- [x]` in the file is an
acceptance criterion. Commits whose subject or body cite the ID are listed with the spec. Other
layouts are supported too, see [Spec formats](#spec-formats).

**Gallery (optional).** Reference images in `gallery.dir`, shown side by side with a fresh render
produced by your own command. Every run with renders keeps a snapshot in `<outDir>/history/`, which
feeds the timeline.

## Config

`specpulse.config.json` (or `.specpulse.json`) in the project root, or a `specpulse` key in
`package.json`. Every field is optional; the JSON Schema is shipped in
[`schema/config.schema.json`](schema/config.schema.json).

```json
{
  "$schema": "./node_modules/specpulse/schema/config.schema.json",
  "title": "My App",
  "locale": "en",
  "outDir": ".cache/specpulse",
  "dataFile": "docs/progress.json",
  "roadmap": "docs/roadmap.md",
  "phaseFile": "docs/phase-{n}/README.md",
  "specs": { "dir": "docs/specs", "idPattern": "[A-Z]+-\\d{3,}", "format": "markdown" },
  "gallery": {
    "dir": "tests/golden",
    "sceneExt": ".scene",
    "referenceExt": ".png",
    "render": "my-renderer {scene} -o {out}"
  },
  "timelineLimit": 30,
  "live": { "check": "npm test", "checkOnChange": false, "claudeSessions": false, "commits": 30 }
}
```

| Field                     | Default                    | Meaning                                                                    |
| ------------------------- | -------------------------- | -------------------------------------------------------------------------- |
| `title`                   | `package.json` name        | Dashboard title.                                                           |
| `locale`                  | `en`                       | `en`, `pt-BR` or `es` (viewers can switch in the header).                  |
| `outDir`                  | `.cache/specpulse`         | Output folder.                                                             |
| `dataFile`                | `docs/progress.json`       | Data file (below).                                                         |
| `roadmap`                 | `docs/roadmap.md`          | Phase table.                                                               |
| `phaseFile`               | `docs/phase-{n}/README.md` | Milestone table per phase; `{n}` is the phase number.                      |
| `specs.dir`               | `docs/specs`               | Spec folder.                                                               |
| `specs.idPattern`         | `[A-Z]+-\d{3,}`            | Regex for spec IDs.                                                        |
| `specs.format`            | `markdown`                 | `markdown`, `frontmatter` or `auto` ([Spec formats](#spec-formats)).       |
| `specs.acceptanceHeading` | none                       | Only checkboxes under this heading count.                                  |
| `specs.idFrom`            | per format                 | `heading`, `filename` or `frontmatter`.                                    |
| `gallery`                 | off                        | Enables the gallery and timeline.                                          |
| `gallery.dir`             | required                   | Reference image folder.                                                    |
| `gallery.referenceExt`    | `.png`                     | Reference image extension.                                                 |
| `gallery.sceneExt`        | none                       | When set, each `<name><sceneExt>` is a scene; otherwise each image is one. |
| `gallery.render`          | none                       | Shell command; placeholders `{scene}`, `{out}`, `{name}`.                  |
| `timelineLimit`           | `30`                       | Snapshots shown in the timeline.                                           |
| `live.check`              | none                       | Command behind the Live view's "Run check" button.                         |
| `live.checkOnChange`      | `false`                    | Also run the check after changes (debounced, never in parallel).           |
| `live.claudeSessions`     | `false`                    | Opt-in for Claude Code session metadata in the Live view.                  |
| `live.commits`            | `30`                       | Commits in the Live feed.                                                  |

Unknown keys are rejected, so typos fail loudly.

## Data file

Milestone status is never guessed. The data file says, per milestone, either which specs make it up
(progress = checked / total acceptance checkboxes) or a manual status with its source. A milestone
missing from the file is "to do". Schema: [`schema/data.schema.json`](schema/data.schema.json).

```json
{
  "milestones": {
    "0.1": { "status": "done", "source": "docs/phase-0/README.md" },
    "1.1": { "specs": ["APP-001", "APP-002"], "note": "CI not running yet" }
  },
  "images": {
    "home": { "approved": false }
  }
}
```

- `status`: `done`, `in progress` (or `doing`), `todo`. A manual status wins over `specs` and
  should always come with `source`.
- `images.<name>.approved: false` shows an "awaiting owner approval" badge in the gallery.
- Portuguese keys and values are accepted too (`marcos`, `goldens`, `fonte`, `nota`, `aprovada`,
  `feito`, `em andamento`, `a fazer`).

Keep it current: when a spec or milestone is done, update the file in the same commit.

## Spec formats

`specs.format` chooses how spec files are read:

- `"markdown"` (default): the ID and title come from a `# APP-001 · Title` heading (`:`, `-` or
  `—` also work as separators) and every `- [ ]` / `- [x]` checkbox is an acceptance criterion.
  Only files whose name starts with the ID are read.
- `"frontmatter"`: a `---` block at the top of the file declares `id`, `title`, `status` and
  `milestone`:

  ```md
  ---
  id: ACC-001
  title: Sign-up form
  status: doing        # done / doing / todo, plus synonyms like wip, completed, backlog
  milestone: "1.1"
  ---
  ```

  Checkboxes in the body still count. A spec with a `status` and no checkboxes takes its progress
  from the status. Any `.md` file in the specs folder except `README.md` is read. Only a small YAML
  subset is supported: plain or quoted scalars and flat lists (`[a, b]` or `- a` lines). A file
  without a closed `---` block is read as plain markdown, and lines that can't be parsed are
  skipped.
- `"auto"`: picks per file, so both styles can live in one folder.

`specs.acceptanceHeading` (e.g. `"Acceptance"`) counts only the checkboxes under that heading and
its subsections (case and a trailing colon are ignored). `specs.idFrom` (`"heading"`,
`"filename"` or `"frontmatter"`) forces where the ID comes from.

A `milestone` in frontmatter links the spec to that milestone without listing it under
`milestones.<id>.specs` in the data file; the two sources are combined. If the data file lists the
spec under a different milestone, the dashboard shows a warning. See
[`examples/frontmatter`](examples/frontmatter) for a project that mixes both formats.

## Live mode

`specpulse --serve` builds the dashboard, serves it on `127.0.0.1` and watches the roadmap, phase
files, specs, the data file, the gallery and git (HEAD and refs). Changes reach every open page in
about a second over Server-Sent Events, without a reload, keeping the current view, filters, scroll
and open sections. A dot in the header shows the connection; it reconnects by itself.

- **Live view**: commit feed (new commits are highlighted), `git status` grouped by folder, files
  touched in the last 10 minutes, and a **Run check** button for `live.check` (one run at a time;
  with `checkOnChange` it also runs after changes).
- **Render now**: with `gallery.render`, a button re-renders the gallery from the page.
- **Security**: the server only listens on `127.0.0.1`, rejects requests whose `Host` is not
  `localhost`/`127.0.0.1` (DNS rebinding), and `POST` actions need a per-session token embedded in
  the served page. Nothing live is written into the static `index.html`.

### Claude Code sessions (opt-in)

With `--claude-sessions` (or `"live": { "claudeSessions": true }`), the Live view also shows what
local Claude Code sessions are doing in this project. specpulse then reads, **read-only**, the
transcripts in `~/.claude/projects/<project path with every non-alphanumeric character as ->/` and
shows **only metadata**: session start and last activity, tool names, file paths **inside the
project**, times, and the subjects of `git commit` commands. Prompt and reply text, tool inputs
(full commands, edited content) and tool results are never shown, stored or sent anywhere; paths
outside the project are hidden. It is off by default, and without the opt-in no file under
`~/.claude` is opened.

## Using with Claude Code

specpulse ships a Claude Code skill that teaches the agent to keep the data file honest: tick
acceptance criteria in the spec, list specs on their milestone, set a manual `status` only with a
`source`, never approve a gallery image, and update the data file in the same commit as the change.

```sh
npx specpulse skill install            # → .claude/skills/specpulse/SKILL.md (this project)
npx specpulse skill install --user     # → ~/.claude/skills/specpulse/SKILL.md (all projects)
npx specpulse skill install --force    # overwrite an existing copy
```

### Plain-text summary

```sh
npx specpulse --summary
```

Prints the current phase, every milestone with its status, progress and source, and the specs that
still have open acceptance criteria. It writes nothing, so agents (and CI logs) can read progress
without opening the HTML.

```
Current phase: 1 Core

Phase 1 Core: doing 33%
  - 1.1 Parser: doing 67% | specs APP-001 (2/3 criteria)
  - 1.2 CLI: todo 0% | specs APP-002 (0/2 criteria) | note: waiting for the parser
Phase 2 Editor: todo 0%
  - 2.1 Canvas: todo 0% | no entry in docs/progress.json

Open specs:
- APP-001 Parser: 1 of 3 criteria open | milestone 1.1 | docs/specs/APP-001-parser.md
- APP-002 CLI: 2 of 2 criteria open | milestone 1.2 | docs/specs/APP-002-cli.md
```

## MCP server

`specpulse mcp [--cwd <dir>] [--config <path>]` runs a [Model Context Protocol] server over stdio
(no SDK, no extra dependencies) with three tools:

| Tool                | What it does                                                                                                                                                                                                               |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `progress_status`   | Current phase, milestones (status, progress, source) and open specs. Optional `phase`, `spec`.                                                                                                                             |
| `progress_update`   | Edits the data file: `{ milestone, status?, source?, specs?, note? }` or `{ image, approved: false }`. Keeps key order, `$comment` and the file's language; refuses `approved: true` and a manual status without `source`. |
| `progress_snapshot` | Regenerates the dashboard (like `--no-render`) and returns its path plus the summary.                                                                                                                                      |

Register it in Claude Code:

```sh
claude mcp add specpulse -- npx -y specpulse mcp
# shared with the team (writes .mcp.json in the project):
claude mcp add --scope project specpulse -- npx -y specpulse mcp
```

Clients that read an `mcpServers` config file (Claude Desktop, editors, other agents):

```json
{
  "mcpServers": {
    "specpulse": {
      "command": "npx",
      "args": ["-y", "specpulse", "mcp", "--cwd", "/path/to/your/project"]
    }
  }
}
```

`--cwd` matters for clients that do not start the server in the project folder. On Windows, if the
client cannot find `npx`, use `"command": "cmd"` with `"args": ["/c", "npx", "-y", "specpulse", "mcp", …]`.

[Model Context Protocol]: https://modelcontextprotocol.io

## Programmatic API

```ts
import { generate, loadConfig } from "specpulse";

const root = process.cwd();
const { config } = loadConfig(root);
const { index, page } = generate({ root, config, render: false });
```

The pure building blocks (`parseRoadmap`, `parseMilestones`, `parseSpec`, `readSpec`,
`parseGitLog`, `parseDataFile`, `updateDataFile`, `parseConfig`, `buildModel`, `summaryText`,
`renderView`, `renderHtml`, …) are exported as well.

## CI

```yaml
- run: npx specpulse --no-render
- run: npx specpulse --summary # progress in the job log
- uses: actions/upload-artifact@v4
  with: { name: progress, path: .cache/specpulse }
```

## Development

```sh
pnpm install
pnpm check        # biome + tsc + vitest
pnpm build        # dist/
pnpm test:pack    # pack, install the tarball in a temp project, run the bin (after build)
PLAYWRIGHT=/path/to/playwright pnpm test:ui   # browser checks, static and live (optional)
node dist/cli.js --cwd examples/basic --open
```

## License

[MIT](LICENSE) © 2026 Jeferth Crisostomo
