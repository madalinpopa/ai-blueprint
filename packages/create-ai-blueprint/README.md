# create-ai-blueprint

AI Blueprint is a file-backed control system for AI-assisted development. It
gives coding agents a shared workflow to plan, build, verify, and document one
feature at a time, with human review gates before code changes and merges.

It works with any stack and installs inside an app you have already scaffolded.
Plans, specs, project context, findings, configuration, and completed-work
history stay as readable files in your repository.

[![npm version](https://img.shields.io/npm/v/create-ai-blueprint?style=flat-square&color=155eef)](https://www.npmjs.com/package/create-ai-blueprint)
[![Validate Blueprint](https://github.com/aiblueprinthq/ai-blueprint/actions/workflows/validate.yml/badge.svg)](https://github.com/aiblueprinthq/ai-blueprint/actions/workflows/validate.yml)
[![MIT license](https://img.shields.io/npm/l/create-ai-blueprint?style=flat-square&color=155eef)](LICENSE)

[Official site](https://ai-blueprint.dev) |
[Documentation](https://ai-blueprint.dev/docs/) |
[Repository](https://github.com/aiblueprinthq/ai-blueprint) |
[Changelog](https://github.com/aiblueprinthq/ai-blueprint/blob/main/CHANGELOG.md)

Requires Node.js 22 or newer. Run the installer from an application that has
already been scaffolded and initialized as a Git repository.

```bash
npx create-ai-blueprint@latest
```

You can also use npm's initializer form:

```bash
npm create ai-blueprint@latest
```

The installer copies the Blueprint workflow files into the current directory:

- `AGENTS.md`
- `CLAUDE.md`
- `blueprint/config.json`
- `blueprint/.state/manifest.json`
- `.agents/`
- `.claude/`
- `blueprint/`

It keeps the app's root `README.md` alone.

See [Commit and PR attribution](https://github.com/aiblueprinthq/ai-blueprint/blob/main/blueprint/context/ai-interaction.md#commit-and-pr-attribution)
for the rule for all AI tools and optional settings that reduce unwanted AI signatures.

## Core workflow

Blueprint starts with your plans, then repeats one controlled loop for every
feature or fix:

1. Run `/onboard` or `$onboard` to tune Blueprint to the real project.
2. Write `blueprint/project-plan.md` and `blueprint/build-plan.md` directly, or
   use the optional discovery skill to develop them through conversation.
   A plain feature list is enough for the build plan.
3. Run `/overview` or `$overview` to format that list into a tracked checklist
   without changing its scope or order, then generate durable project context.
   Formatting needs no extra approval; unclear scope or order does. On the first
   run, it offers a reviewed local commit for the Blueprint setup and plans.
4. Run `/feature` or `$feature` for the next planned feature, or use the fix
   skill for a focused bug or small change.
5. Review the spec, then run `/implement` or `$implement` to build it in small,
   visible steps.
6. Run `/check` or `$check` to prove the behavior against the real app.
7. Run `/complete` or `$complete` to archive the work and request merge
   approval.

Plans, current work, verification evidence, findings, and completed history stay
in the repository, so another session or supported coding tool can continue
from the same state.

## Tool support

| Tool | Installed adapter | Invocation |
| --- | --- | --- |
| Codex | `.agents/skills/` | `$feature`, `$implement`, or plain language |
| Claude Code | `.claude/skills/` | `/feature`, `/implement`, and other slash commands |
| GitHub Copilot | `AGENTS.md` and `.agents/skills/` | Ask Copilot to run the matching skill |
| OpenCode | `AGENTS.md` and compatible `.agents/skills/` or `.claude/skills/` | Ask OpenCode to run the matching skill |
| Other tools | `AGENTS.md` plus readable skill files | Ask the agent to follow the matching `SKILL.md` |

If you install `--claude` or `--all` while Claude Code is already open in the
project, restart Claude Code in that folder so the newly added project skills
appear.

## Options

```bash
npx create-ai-blueprint@latest -- --codex
npx create-ai-blueprint@latest -- --claude
npx create-ai-blueprint@latest -- --copilot
npx create-ai-blueprint@latest -- --opencode
npx create-ai-blueprint@latest -- --codex --opencode
npx create-ai-blueprint@latest -- --all
npx create-ai-blueprint@latest -- --both
npx create-ai-blueprint@latest -- --force
npx create-ai-blueprint@latest -- --target ./my-app
```

The same flags work with `npm create ai-blueprint@latest -- ...`.

The interactive installer shows a checkbox list with Claude Code and Codex
selected by default. GitHub Copilot and OpenCode remain available but unchecked.
Adapter flags are composable, so scripts can select any combination.
`--both` remains as a deprecated alias for `--all` and prints a warning. GitHub
Copilot uses `AGENTS.md` and the shared `.agents/skills/` files; the installer
does not manage `.github/copilot-instructions.md`. OpenCode reuses the compatible
`.agents/skills/` or `.claude/skills/` tree instead of creating duplicate
`.opencode/skills/` files.

Use `--force` to overwrite existing Blueprint files. Without `--force`, the
installer asks before overwriting in an interactive terminal and exits in
non-interactive runs.

## Optional capabilities

The core workflow stays focused. Use these capabilities when the project needs
them:

- `/brief` or `$brief` previews an upcoming build-plan feature before you spec
  it.
- `/debug` or `$debug` investigates a failure without editing code.
- `/audit` and `/try`, or their Codex `$` forms, add code review and a human
  walkthrough. `/audit independent current` prepares an approved checkpoint for
  a selected fresh reviewer adapter and model, then records a staleness-checked
  receipt.
- `/tests` or `$tests` establishes unit testing. The optional `/ci` or `$ci` skill
  defines one shared local and GitHub verification command from checks the
  project already has.
- `/browser-tests` or `$browser-tests` explicitly adds or normalizes a repeatable
  browser harness, preferring an existing runner and otherwise using Playwright
  for compatible projects. Check and Continuous Mode reuse its documented
  command; installation never adds it automatically.
- `/rollback` or `$rollback` plans a reviewed reversal from the archived spec
  and exact feature commit without erasing history.
- `/autopilot` or `$autopilot` runs one bounded feature or fix through its
  configured gates, then stops before completion.
- `/continuous` or `$continuous` processes the remaining reviewed build plan
  serially with one local branch and commit per feature. It never pushes.
- `/release` or `$release` prepares local Render or Vercel configuration and
  release checks. It never deploys without separate approval.

## Updating an existing installation

Preview the update plan:

```bash
npx create-ai-blueprint@latest update --dry-run
```

Apply the update:

```bash
npx create-ai-blueprint@latest update
```

The updater detects the installed adapters and manages only these paths:

- `.agents/skills/`
- `.claude/skills/`

It preserves `AGENTS.md`, `CLAUDE.md`, project configuration, project and build
plans, context, history, references, and prototypes. An unchanged `blueprint/README.md` installed by an
older version is removed during update; a locally modified copy keeps the normal
conflict protection. The `blueprint/.state/manifest.json` file records the
installed version and hashes of managed files.

`blueprint/config.json` is user-owned project policy. It controls the version
control system, review cadence,
checkpoint availability, branch prefixes, verification strictness, independent-review execution, regular and
Continuous quality gates, and Continuous Mode limits. Audit, independent-review,
check, and try-guide gates use built-in defaults. Independent review defaults to
`when-sensitive` for regular and Continuous work, while audit, check, and try
guide default to `manual`. Sensitive or unusually broad work is selected for
independent review, while ordinary small features are not. Setting a workflow's
independent review policy to `manual` disables automatic selection; an explicit
`/audit independent current` still uses the configured execution method. A
missing file uses built-in defaults; an invalid file is reported by status and
blocks mutating workflow skills until `/doctor` identifies the repair.
Configuration never grants permission to
commit, merge, push, deploy, publish, or take destructive action. Only an
explicit `/continuous` or `$continuous` request starts the multi-feature loop.

`vcs` names the version control system the workflow uses, `git` or `jj` for
Jujutsu. It defaults to `git`, and an omitted value keeps that default, so
existing projects are unchanged. The setting selects the commands workflow
skills run; it never grants permission to commit, merge, push, or take
destructive action.

`review.independentExecution` defaults to `automatic`, which uses a fresh
isolated reviewer child when a selected independent-review gate runs
and the active adapter can expose its exact reviewer identity and model. When it
cannot, Blueprint preserves the request and stops with the manual fresh-session
handoff. Set it to `manual` to always use that handoff. The setting changes
execution only; `qualityGates` still decides when independent review is selected.
The automatic reviewer is a generic child of the current runtime and reads the
installed project's Audit skill and review contract. Blueprint does not require
or discover a global agent role, skill, prompt, or TraversyFlow component.
New requests record requested execution and completed receipts record actual
execution. Automatic-to-manual fallback is explicit, and legacy receipts remain
compatible only as fresh-session manual reviews.

## Context efficiency

New installations make Claude Code import only `AGENTS.md` at startup. Explicit
workflow skills load the compact overview, active spec, coding standards, and
interaction guide on demand. Feature uses targeted repository reads and writes
one reviewed spec. Implement reuses that spec and normally runs the full Verify
command once after all steps. New project configuration also defaults to one
feature-level review packet with step checkpoint commits disabled.

The updater preserves `CLAUDE.md` and `blueprint/config.json`, so existing
projects do not receive those user-owned changes automatically. Run `/doctor` to
identify an oversized overview. The updater directly reports the obsolete
`project-overview.md` and `current-feature.md` import lines when they are present
in `CLAUDE.md`. Older layouts may also contain direct `coding-standards.md` and
`ai-interaction.md` imports, which the updater reports too. Remove every reported
line, restart Claude Code in the project, rerun `/overview` when needed, and
choose the lower-context defaults in `blueprint/config.json` if they fit the
project:

```json
"workflow": {
  "stepReview": "feature",
  "checkpointCommits": "disabled"
}
```

These settings are separate. `stepReview: "every"` restores the approval pause
after each implementation step, but it does not enable checkpoint commit prompts.
To match the previous workflow exactly, use:

```json
"workflow": {
  "stepReview": "every",
  "checkpointCommits": "enabled"
}
```

Context savings from the compact overview, on-demand project context, and
shorter skill descriptions still apply. Feature may pause when a missing choice
would define public behavior, security, persisted data, or interoperability. It
does not pause for reversible internal details with no current compatibility
surface.

Onboarding offers **Efficient**, **Guided**, and **Custom** implementation styles.
They write only the existing `stepReview` and `checkpointCommits` values, so no
additional mode is stored. You can edit either value later; the next Implement
run uses the current configuration.

Use `/context all` in Claude Code to inspect the live result. See the
[controlled benchmark](https://github.com/aiblueprinthq/ai-blueprint/blob/main/benchmarks/context-efficiency.md)
for the two charts, exact results, method, and limits.

Locally modified managed files are reported as conflicts. Interactive updates
ask before replacing them. Non-interactive updates exit unless you pass
`--force`, which backs up the conflicting files before replacement. Backups are
stored under `blueprint/.state/backups/` and ignored by git.

The first update of a legacy install creates the manifest. Files that already
match the current package are adopted automatically. Differing files remain
conflicts so local changes are not lost.

## Checking project status

Run the read-only status command from a Blueprint project or any directory
inside it:

```bash
npx create-ai-blueprint@latest status
```

It reports configuration state, recorded command activity, build-plan progress,
active work, findings, independent-review state, Git state, drift warnings,
completion blockers, and one
suggested next action. Onboarding uses a dedicated setup marker, overview
freshness uses a fingerprint of both plans that ignores checkbox completion
markers while still detecting plan content changes. A verified active-work
status makes the completion gate ready, while no active work reports the gate as
idle. Running command activity overrides
contradictory next-action advice, and an activity record that stops updating is
shown as interrupted instead of running forever. Malformed generated activity
points to `/doctor`, which can offer to reset only `blueprint/.state/run.json`
after approval. For scripts and integrations, request the versioned JSON object:

```bash
npx create-ai-blueprint@latest status --json
```

Tracked workflow skills use the packaged dashboard activity helper instead of
constructing `run.json` directly. The helper validates every field before an
atomic replacement. Invalid updates fail without replacing the previous valid
state, and the next tracked command safely replaces malformed legacy state.

After an interactive Blueprint install or update, the installer checks the
global CLI version. It offers to run the following command only when the CLI is
missing or does not match the npx package version:

```bash
npm install --global create-ai-blueprint@latest
```

The prompt defaults to no and is skipped for matching versions, non-interactive
runs, and `--yes` runs. Accepting it installs or refreshes the CLI at the same
version used by the npx command. Global installation exposes the shorter forms
`blueprint status`, `blueprint status --json`, and `blueprint dashboard`. Use
`--target ./my-app` to inspect an explicit project directory. Status never edits
project or Git state.

## Opening the local dashboard

Run the on-demand read-only dashboard from a Blueprint project or any directory
inside it:

```bash
blueprint dashboard
```

The command binds to `127.0.0.1` on an available port, opens the dashboard in
your browser, and refreshes immediately when project or Blueprint files change,
with a ten-second fallback check. It does
not edit project files, run workflow commands, start the application, or make
the dashboard available outside the local machine. It leads with the suggested
next action, then shows recorded command activity, active work and build steps,
the build-plan roadmap, project and Git state, findings, completion blockers,
and archived work. Autopilot and Continuous runs include their mode, progress,
configured gates, local boundary, and safe resume command when one is available.
Press Ctrl+C to stop it. Use `blueprint dashboard --no-open` when you want the
URL without opening a browser. The older `blueprint ui` form remains as a
deprecated alias.

The optional global `blueprint` command is limited to read-only project status
and this local dashboard. Continue to use `npx create-ai-blueprint@latest` for
installation and `npx create-ai-blueprint@latest update` for managed workflow
updates.

## Help and contributing

- Read the [full documentation](https://ai-blueprint.dev/docs/).
- Report reproducible problems through the repository's
  [issue forms](https://github.com/aiblueprinthq/ai-blueprint/issues/new/choose).
- Follow the repository's
  [security policy](https://github.com/aiblueprinthq/ai-blueprint/security/policy)
  for private vulnerability reports.
- Read the
  [contribution guide](https://github.com/aiblueprinthq/ai-blueprint/blob/main/CONTRIBUTING.md)
  before opening a pull request.

## License

MIT
