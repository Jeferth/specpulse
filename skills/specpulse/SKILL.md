---
name: specpulse
description: Keeps the specpulse progress data file (docs/progress.json by default) correct. Use it when you finish or check off acceptance criteria of a spec, complete a milestone, create a new spec that belongs to a milestone, or when someone mentions approving or rejecting a gallery image, so the dashboard reflects real progress without guessed statuses.
---

# specpulse: keep the progress data honest

specpulse builds a local progress dashboard from files in this repo. Most progress is **derived**:
phases come from the roadmap, milestones from the phase files, spec progress from the acceptance
checkboxes (`- [ ]` / `- [x]`) in each spec, and commits from `git log` (a commit that cites a spec
ID counts toward that spec). Only what cannot be derived lives in the **data file**. Your job is to
keep that file in sync with the work, in the same commit as the change it reflects.

## Where things are

- Config: `specpulse.config.json` (or `.specpulse.json`) in the project root. Without one the
  defaults apply. Fields that matter here:
  - `dataFile` (default `docs/progress.json`) - the file you edit.
  - `roadmap` (default `docs/roadmap.md`), `phaseFile` (default `docs/phase-{n}/README.md`) -
    phases and milestones (`| **1.2 Name** | delivery |` rows).
  - `specs.dir` (default `docs/specs`), `specs.idPattern` (default `[A-Z]+-\d{3,}`) - spec files.
- Read the config first; do not assume the defaults when a config file exists.

## Data file format

```json
{
  "$schema": "node_modules/specpulse/schema/data.schema.json",
  "milestones": {
    "1.1": { "specs": ["APP-001", "APP-002"], "note": "optional note" },
    "0.3": { "status": "done", "source": "README: install steps verified" }
  },
  "images": {
    "hero": { "approved": false, "note": "regressed after the theme change" }
  }
}
```

- Keys may be English (`milestones`, `images`, `source`, `note`, `approved`) or Portuguese
  (`marcos`, `goldens`, `fonte`, `nota`, `aprovada`). **Keep the language the file already uses**;
  never mix or translate keys. A new file uses English.
- Status values: `done`, `doing` (or `in progress`), `todo`; in Portuguese files `feito`,
  `em andamento`, `a fazer`.
- A milestone with no entry is shown as "to do".
- Keep `$schema`, `$comment`, key order and 2-space indentation as they are.

## Rules

1. **Prefer specs over manual status.** If a milestone is delivered by specs, list them in
   `specs` and tick the acceptance checkboxes in the spec files. Its progress is then computed.
2. **A milestone that has `specs` gets no `status`.** Never add a status to make it look done;
   finish (and tick) the criteria instead.
3. **A manual `status` always comes with `source`**: where the status was verified (a README
   section, a demo, a commit hash, the owner's message). No source means no status.
4. **Never mark an image as approved** (`approved: true` / `aprovada: true`). Approving a
   reference image is the project owner's decision. You may set `approved: false` to flag a
   regression, and tell the owner.
5. **Same commit.** Update the data file in the same commit as the spec or milestone change it
   reflects, so history never shows progress that was not there.
6. Only tick an acceptance checkbox when that criterion is actually met (tests pass, behaviour
   verified). Leave manual-test criteria unchecked until a human confirms them.
7. Do not edit anything in the output folder (`outDir`, default `.cache/specpulse`); it is generated.

## When to do what

- **Finished a spec criterion**: tick `- [x]` in the spec file. If the spec is not yet listed in
  its milestone's `specs`, add it.
- **Created a new spec for a milestone**: add its ID to that milestone's `specs`.
- **Completed a milestone that has no specs**: set `status` and `source`.
- **Image looks wrong after a change**: set `approved: false` with a `note`; do not approve.

## How to verify

```sh
npx specpulse --summary      # plain-text summary: current phase, milestones, open specs
npx specpulse --no-render    # rebuild the dashboard without running the render command
```

Read the summary after your edit: each milestone shows its status, progress and source
(`specs APP-001 (2/3 criteria)`, `manual (docs/progress.json: README)`, or `no entry`). If it
shows something you did not intend, fix the data file before committing. A validation error
names the file and the bad field (e.g. `docs/progress.json: milestones.1.1.status must be one of: ...`).

## Alternative: MCP tools

If the `specpulse` MCP server is registered (`claude mcp add specpulse -- npx specpulse mcp`),
use its tools instead of editing JSON by hand:

- `progress_status` - read progress (optional `phase`, `spec` filters).
- `progress_update` - `{ milestone, status?, source?, specs?, note? }` or
  `{ image, approved: false, note? }`. It enforces the rules above and keeps the file's language.
- `progress_snapshot` - regenerate the dashboard and get its path.

## Example diffs

Spec APP-002 gets its first criterion done and joins milestone 1.2:

```diff
 # docs/specs/APP-002-cli.md
-- [ ] `app parse <file>` prints the tree
+- [x] `app parse <file>` prints the tree
```

```diff
 # docs/progress.json
   "milestones": {
     "1.1": { "specs": ["APP-001"] },
-    "1.2": { "note": "waiting for the parser" }
+    "1.2": { "specs": ["APP-002"], "note": "waiting for the parser" }
   },
```

A milestone without specs, verified by hand:

```diff
-    "0.3": {}
+    "0.3": { "status": "done", "source": "README: install steps verified on a clean machine" }
```

Portuguese file, same change (keys and status words stay Portuguese):

```diff
-    "0.3": {}
+    "0.3": { "status": "feito", "fonte": "README: instalação conferida" }
```

Wrong (do not do this):

```diff
-    "1.1": { "specs": ["APP-001"] }
+    "1.1": { "specs": ["APP-001"], "status": "done" }
```

```diff
-    "hero": { "approved": false }
+    "hero": { "approved": true }
```
