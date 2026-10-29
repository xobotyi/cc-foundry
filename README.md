# cc-foundry

Plugins that give Claude Code a working discipline (how it codes, commits, plans, and writes) and the language and
platform knowledge to apply it. It is the set its author works with every day, made public, and its rules come with
their reasons.

Left to its defaults, Claude skips the skill that holds the answer and forgets the ones it loaded. It commits an hour of
work as one unit, writes JavaScript from twenty years of the language at once, and resumes after your lunch break as
though you never left. Each plugin below targets one failure like these. Some of them are measured: across four frontier
models, agents opened a repository's AI policy file in 3.5% of unaided runs, and the `open-source` plugin starts from
that number.

Foundry is built for Claude Code, and the hooks, output styles, status line, and language-server configs work only
there. Most of the skills adapt to other agents with little work: each one is a folder with a `SKILL.md` and any
references it carries, and the usual changes are where it reads project rules (`CLAUDE.md`) and how it loads the skills
it depends on. The exceptions are the few skills whose subject is Claude Code itself, such as `claude-md` and
`output-style-engineering`.

## Start Here

Install what matches your work. Each command adds the marketplace the first time it runs.

- **You write code** — `the-coder` for the workflow, `git-commit` for the history, `skill-enforcer` so the skills load
  when the work calls for them, and your language: `golang`, `javascript`, `php`, `python`, or `rust`.
- **You build prompts, skills, agents, or output styles** — `ai-helpers`.
- **You plan work before anyone builds it** — `the-blueprint`.
- **Your sessions run long or unattended** — `wall-clock` for the time, `the-statusline` for context and rate limits,
  and `the-workflow` for handoffs between sessions.

```
/plugin install the-coder --marketplace xobotyi/cc-foundry
/plugin install git-commit --marketplace xobotyi/cc-foundry
/plugin install skill-enforcer --marketplace xobotyi/cc-foundry
/plugin install golang --marketplace xobotyi/cc-foundry
```

Swap `golang` for your language.

## Built From Daily Use

Foundry grows out of its author's own work. A plugin exists because a real workflow needed it, and it is maintained as
part of a working setup: fixed when it fails in use, changed when the work changes. Nothing here was built to fill a
catalog or to chase attention.

The repository itself is developed with these plugins, so it doubles as a sample of what they produce.
[`.claude/settings.json`](.claude/settings.json) enables eight of them for every session opened here, and the commit log
is `git-commit` output. A fix from the status line, cause first, then what the user saw
([ae8e706](https://github.com/xobotyi/cc-foundry/commit/ae8e706)):

```
[the-statusline] keep the root when collapsing an absolute path

Collapsing cut each directory segment to its first character, and the
empty segment before a leading slash became undefined, which the posix
join rejects. A working directory outside home and the project crashed
the renderer on a narrow pane, leaving the status line blank.
```

The decisions about how the skills are written live in [`design-docs/adr/`](design-docs/adr/), kept with the
`the-blueprint` plugin's `adr` skill and indexed in [`design-docs/ADR.md`](design-docs/ADR.md) for every session.

## Workflow

### the-coder

Claude writes code before it reads what exists: it guesses at APIs, skips tests, and multiplies abstractions. The
`coding` skill enforces a discovery-first workflow (discover, plan, implement, verify), and the `software-engineer`
output style carries the peer-engineering register and the skill queue. Every language plugin runs on top of it.
[Read more](plugins/the-coder/)

### skill-enforcer

Claude skips skills and forgets them mid-session. Lifecycle hooks make it check which skills apply at every checkpoint:
your prompt, after it reads a file, after it edits one, and after it loads a skill. When the work shifts from coding to
testing, it goes back to the references it has not read. [Read more](plugins/skill-enforcer/)

### git-commit

An hour of work lands as one commit under a message that says nothing. The `commit` skill splits the diff into the
smallest units it judges to keep the tree working, orders them, and audits every message body paragraph by paragraph
against the staged diff, so a body that narrates the code gets cut before it is committed.
[Read more](plugins/git-commit/)

### the-blueprint

Planning comes out too shallow or too detailed. The DRAFT pipeline (Discovery → Research → Alignment → Frame → Tasks)
moves an idea through approval gates to sized work items. Standalone skills cover tracker items (`task-creation`),
shared vocabulary (`glossary`), living decision records (`adr`), YouTrack behavior (`youtrack`), and diagrams
(`diagramming`). [Read more](plugins/the-blueprint/)

### the-workflow

The mechanics of working with Claude Code across sessions. `claude-md` owns CLAUDE.md and `.claude/rules/`, starting
from which files load when and what survives compaction. `handoff` writes a 500–2000-token transfer document when work
crosses a context boundary, and `debrief` turns the corrections you made into rules the agent reads next time, after you
approve them. [Read more](plugins/the-workflow/)

### the-writer

Agent prose carries tells, and readers discount the substance along with the style. The `humanize` skill traces them to
the post-training pressures that produce them, and decides whether a text should be edited before it decides what to
edit. [Read more](plugins/the-writer/)

### open-source

Contributing to a project you don't maintain means following rules that live outside its code. `issue-writing` and
`pr-contribution` start from the project's own files and draft reports and pull requests for a human to submit.
[Read more](plugins/open-source/)

## Session

### wall-clock

Claude Code gives the model today's date and nothing else about time. Hooks inject the wall clock on every prompt, with
how long you were away, and once a minute during a long turn. [Read more](plugins/wall-clock/)

### the-statusline

A two-row status line: output style, model and effort, session cost, context left, the rate limit closest to running
out, working directory, git branch, and lines changed. The color grows more urgent as context or limits run low.
[Read more](plugins/the-statusline/)

### plugin-rollcall

A plugin a repository enables can be missing from your sessions in a fresh clone or a new worktree until you type
`/reload-plugins`. This mod runs the reload at session start and holds your first prompt until it completes. Install it
at user scope. [Read more](plugins/plugin-rollcall/)

## AI Artifacts

### ai-helpers

Skills for each artifact you build for an agent: `prompt-engineering` as the foundation, then `skill-engineering`,
`subagent-engineering`, `output-style-engineering`, and `prompt-terser` for a retrospective audit. The `ai-engineer`
output style sets the register for the work. [Read more](plugins/ai-helpers/)

## Languages

Each language plugin ships a language-server configuration for semantic navigation; its README names the server to
install.

### golang

Conventions, error handling, interfaces, generics, concurrency, and testing, written for the version the module's `go`
directive permits. Library skills: `templ`, `charm-tui` for the Charmbracelet v2 stack, and `zog`.
[Read more](plugins/golang/)

### javascript

Claude writes JavaScript from twenty years of the language at once. `javascript`, `typescript`, `nodejs`, `bun`, and
`vitest` hold it to the baseline and the runtime version the project declares. [Read more](plugins/javascript/)

### php

PHP 8.5 and later: `php` for the language, Composer, and PSR conventions, with `phpunit` and `pest` for tests.
[Read more](plugins/php/)

### python

Python 3.14 and later: `python` for idioms, typing, and packaging with uv and ruff, with `pytest` for tests.
[Read more](plugins/python/)

### rust

The 2024 edition: `rust` for ownership, error handling, traits, and concurrency (threads and rayon for CPU work, Tokio
for I/O), with `rust-testing` for tests. [Read more](plugins/rust/)

## Platforms

### frontend

`css`, `tailwindcss` (v4), `react`, `vue`, `svelte` (Svelte 5), and `accessibility` (WCAG 2.2), plus `frontend-design`
for which visible choice to make and how to verify the render across widths and states. [Read more](plugins/frontend/)

### backend

`observability` for the practice of logging, metrics, and tracing together, with `prometheus`, `statsd`, and
`otel-tracing` for the tools. [Read more](plugins/backend/)

### grafana

The other side of `backend`: querying, visualizing, and alerting on telemetry through Grafana. Skills: `dashboards`,
`promql`, `metricsql`, `logsql`, `alerting`, `provisioning`, and `dataviz`. [Read more](plugins/grafana/)

### cli

`cli` designs command-line interfaces in any language: arguments, output streams, exit codes, configuration, and
signals. `shell-scripting` writes the scripts: strict mode, quoting, portability, and error handling.
[Read more](plugins/cli/)

### infrastructure

Without domain knowledge, agents ship configurations with insecure defaults, no idempotency, and naive networking.
`devops` governs the change itself, from target identity to the evidence that closes it, and stays active beside the
tool skill: `ansible`, `containers`, `proxmox`, `unraid`, or `networking`. [Read more](plugins/infrastructure/)

## Updates

Claude Code does not update plugins from this marketplace in the background until you turn it on. Run `/plugin`, open
the **Marketplaces** tab, select **foundry**, and select **Enable auto-update**.

To update by hand, select **Update marketplace** on the same screen. It refreshes the plugin list and updates every
plugin you installed from foundry. From the shell, `claude plugin update <plugin-name>@foundry` updates one plugin.

## License

MIT
