# Portability: the spec, the package, and what does not travel

A skill written for one host is not automatically a skill that works elsewhere. Two standards define the portable
surface, and both stop well short of behavior. Claude Code's own extensions are in [`claude-code.md`](claude-code.md).

## The Agent Skills contract

A skill is a directory containing at minimum `SKILL.md`, with optional `scripts/`, `references/`, and `assets/`.
`SKILL.md` is YAML frontmatter followed by markdown.

**Six recognized frontmatter fields. Two are required.**

- **`name`** — required. 1–64 characters, lowercase `a-z`, `0-9`, and hyphens. No leading or trailing hyphen, no
  consecutive hyphens. **Must match the parent directory name.**
- **`description`** — required. 1–1,024 characters, non-empty. States what the skill does and when to use it.
- **`license`** — optional. A license name or a reference to a bundled license file.
- **`compatibility`** — optional, up to 500 characters. Environment requirements: intended product, system packages,
  network access. Most skills do not need it.
- **`metadata`** — optional. A string-to-string map for client-specific or organizational data. Namespace the keys.
- **`allowed-tools`** — optional and **experimental**. A space-separated string of pre-approved tools, e.g.
  `Bash(git:*) Bash(jq:*) Read`. Support varies between implementations.

Anything else is outside the spec. Validate with `skills-ref validate ./my-skill`.

**Progressive disclosure has three tiers**: metadata at startup (~100 tokens per skill), the full body on activation
(under 5,000 tokens recommended), bundled resources on demand. Keep the body under 500 lines and references one level
deep from `SKILL.md`.

Treat the ~100-token and 5,000-token figures as specification budgets rather than measured costs. The one hard runtime
number is Claude Code's compaction budget, which happens to be the same 5,000 tokens per skill.

## The Agent Plugins contract

Agent Plugins v1 packages skills for distribution. It standardizes the package, not the behavior.

- **Manifest** — `plugin.json` at the **plugin root**. Required: `$schema` and `name`. A missing or malformed required
  field means the client **must reject the whole plugin** and must not execute any component.
- **Plugin name** — 1–64 characters, lowercase alphanumeric plus hyphens and periods, alphanumeric at both ends, no `--`
  or `..`.
- **Optional metadata** — `version` (semver recommended, used for update checks and cache freshness), `description`,
  `author` (only `name`, `email`, `url`), `homepage`, `repository`, `license`, `keywords`. Clients must not reject a
  manifest merely because `version` is not semver or a URL is unrecognized.
- **Component types: exactly two** — skills and MCP servers. Clients must ignore types they do not support.
- **Skill discovery** — the fixed location is `skills/`. Each immediate child directory holding a regular `SKILL.md`
  file is one skill. Clients **must not** recurse deeper.
- **Failure isolation** — a non-conforming skill is skipped and the rest of the plugin still loads.
- **Client extensions** — client-specific data goes under an `extensions` manifest key or a top-level directory named
  with a reverse-domain namespace, e.g. `com.example.client/hooks/`.

Standard layout:

```text
my-plugin/
├── plugin.json
├── skills/
│   └── summarize/
│       ├── SKILL.md
│       ├── scripts/
│       └── references/
├── mcp.json
└── com.example.client/
```

**What Agent Plugins deliberately does not standardize**: agents, commands, hooks, rules, UI extensions, permissions,
sandboxing, marketplace governance, and how a client exposes a skill to users or models. The file contract has converged
much further than the behavior around it.

## Where a skill loses fields

Claude Code accepts every field it defines locally. The paths out of Claude Code accept **only the spec's six**, and
they fail hard rather than ignoring extras:

```text
Unexpected key(s) in SKILL.md frontmatter: argument-hint. Allowed properties are: allowed-tools, compatibility,
description, license, metadata, name
```

That error appears on claude.ai skill uploads, the Skills API, and `package_skill.py`. Enabling a personal skill for
Cowork or cloud sessions uploads it to claude.ai, so the same rule applies there.

**Author the portable core against the six fields, and confine host-specific behavior to a host layer.** A skill that
needs `context: fork`, `hooks`, `paths`, or `` !`command` `` injection is a Claude Code skill, and saying so in
`compatibility` is cheaper than discovering it at upload time.

## Hosts differ in more than frontmatter

Skill locations by host: `~/.claude/skills/` and `.claude/skills/` and plugin `skills/` (Claude Code) ·
`.github/skills/<skill>/SKILL.md` (Copilot code review) · `.agents/skills` (Google Antigravity) ·
`~/.cursor/skills-cursor` for managed skills (Cursor).

**Format compatibility is not utilization equivalence.** Handed identical skill selections, one harness gained +13.4pp
on a benchmark where another gained +5.8pp; trace inspection suggested the weaker one reasoned about bundled scripts
without executing and verifying them. A skill whose value depends on running `scripts/` is a different artifact on a
host that only reads them.

Practical consequences for a portable skill:

- **Do not assume a script will be executed.** State the intent explicitly — "run `scripts/x.py`" reads differently from
  "see `scripts/x.py`" — and make the instruction useless to misread.
- **Do not assume bundled files survive packaging.** One host had to change managed-skill sync specifically so nested
  markdown resources were materialized; before that, references silently went missing.
- **Do not hardcode a model name, a platform path, an OS-specific command, or a host-specific tool call.** These are the
  portability defects that make a skill work only where it was written.

## Skills through the Agent SDK

The filesystem model still applies — there is no programmatic registration API, so skills must exist as files.

- **`settingSources` / `setting_sources` is required.** Default SDK behavior loads no filesystem settings, so skills are
  never discovered without it. This is the most common integration failure, and it fails silently.
- **`"Skill"` must be in the allowed tools** for the Skill tool to exist at all.
- **The `allowed-tools` frontmatter field has no effect.** Control tool access through the SDK's own allowed-tools
  option instead, optionally combined with a permission mode that denies anything unlisted.
- **Sources map to locations** — the project source resolves `.claude/skills/` relative to the working directory, the
  user source resolves the personal skills directory, and installed plugin skills load regardless.

A skill that documents its own tool requirements in `allowed-tools` and nowhere else therefore ships broken to SDK
consumers. State the requirement in prose as well.

## Distribution scopes

- **Project** — commit the skill directory to the repository. Simple, and every checked-in skill adds to the context of
  everyone who opens the repo.
- **Plugin** — a `skills/` directory in a plugin, distributed through a marketplace. Lets consumers choose what to
  install and supports a setup flow. This is the scope that scales past a handful of skills.
- **Managed** — deployed organization-wide through managed settings.

Version the package, not the skill: the Agent Skills frontmatter has no `version` field, and `metadata` is not a release
protocol. Bump the plugin manifest `version` so clients see an update.
