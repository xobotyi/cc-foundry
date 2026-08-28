# Claude Code as a skill host

Claude Code accepts a superset of the Agent Skills frontmatter and adds runtime behavior no other host has. This file is
the lookup layer for that behavior. The portable contract lives in [`portability.md`](portability.md).

## Frontmatter fields

All fields are optional in Claude Code. Only `description` is recommended. Six of these travel outside Claude Code; the
rest do not — see [`portability.md`](portability.md).

- **`name`** — display name in skill listings. Defaults to the directory name. For a plugin skill it sets the last
  segment of the command.
- **`description`** — what the skill does and when to use it. Falls back to the first markdown paragraph when absent.
- **`when_to_use`** — extra routing context: trigger phrases, example requests. Appended to `description` in the listing
  and counted against the same cap.
- **`argument-hint`** — autocomplete hint, e.g. `[issue-number]` or `[filename] [format]`.
- **`arguments`** — named positional arguments for `$name` substitution. Space-separated string or YAML list; names map
  to positions in order.
- **`disable-model-invocation`** — `true` keeps the model from loading the skill, and **removes the description from
  context entirely**. Also blocks preloading into subagents and blocks a scheduled task firing the skill as its prompt.
  Default `false`.
- **`user-invocable`** — `false` hides the skill from the `/` menu and refuses `/name`, leaving model invocation intact.
  Default `true`.
- **`allowed-tools`** — tools usable without a permission prompt during the invoking turn. Grants; never restricts.
- **`disallowed-tools`** — tools removed from the pool while the skill is active. Cannot remove `EndConversation` while
  any other tool remains.
- **`model`** — model for the rest of the current turn, not saved to settings. Accepts `/model` values or `inherit`.
  With `context: fork` it sets the forked subagent's model instead.
- **`effort`** — `low`, `medium`, `high`, `xhigh`, `max`, subject to the model. Overrides session effort while active.
- **`context`** — `fork` runs the skill in a forked subagent.
- **`agent`** — subagent type when `context: fork` is set. Defaults to `general-purpose`.
- **`background`** — only with `context: fork`. `false` waits for the result in the invoking turn. Default `true`.
  Requires v2.1.218 or later.
- **`hooks`** — hooks registered when the skill is invoked, kept for the rest of the session.
- **`paths`** — glob patterns that gate automatic activation to work touching matching files.
- **`shell`** — `bash` (default) or `powershell`, for `` !`command` `` execution.
- **`metadata`** — free-form YAML map for author-owned tooling. Claude Code does not act on it and drops a non-map
  value.
- **`license`**, **`compatibility`** — accepted from the spec, not acted on.

Booleans accept `yes`, `no`, `on`, `off`, `1`, `0`, and `true`/`false` in any case. Before v2.1.218 only `true` and
`false` parsed.

## The description is budgeted, not merely capped

Three limits stack, and the third is the one that surprises authors:

- **1,024 characters** — the spec's hard cap on `description`.
- **1,536 characters** — Claude Code's cap on `description` plus `when_to_use` combined, in the listing. Configurable
  with `skillListingMaxDescChars`.
- **1% of the model's context window** — the whole listing's budget, configurable with `skillListingBudgetFraction` or
  the `SLASH_COMMAND_TOOL_CHAR_BUDGET` environment variable.

**On overflow, Claude Code drops descriptions starting with the least-invoked skills.** The listing always keeps every
skill _name_; a rarely-used skill in a crowded install loses the text that routes it. Front-load the use case so
truncation costs the least.

Diagnostics: `/doctor` estimates the listing's context cost and names its biggest contributors. The Skills row in
`/context` reports the post-budget size. `--debug` logs a warning when the listing overflows. To free budget, set
low-priority entries to `"name-only"` in `skillOverrides`.

## Content lifecycle

- The rendered `SKILL.md` enters the conversation as **one message and stays across later turns**. Claude Code does not
  re-read the file. Write standing instructions, not one-time steps.
- Re-invoking with byte-identical rendered content adds a short "already loaded" note instead of a second copy. Changed
  arguments or changed dynamic-context output append the full content again.
- **Compaction truncates.** After auto-compaction Claude Code re-attaches the most recent invocation of each skill,
  keeping the **first 5,000 tokens** of each, under a **combined 25,000-token budget** filled from the most recently
  invoked. Older skills can be dropped entirely.

Two consequences: the first 5,000 tokens are the durable part of a long skill, and a skill that must survive compaction
has to be re-invoked. If a skill seems to stop steering after the first response, the content is usually still present
and the model is choosing otherwise — strengthen the instructions or enforce with hooks.

## Invocation control

- **Default** — both parties invoke; description always in context.
- **`disable-model-invocation: true`** — user only; **description not in context**. The lever for a heavy skill whose
  routing text would otherwise tax every session. Use for side-effecting workflows: `/commit`, `/deploy`.
- **`user-invocable: false`** — model only; description always in context. Use for background knowledge that is not a
  meaningful user action.

`skillOverrides` in settings sets visibility without editing the file: `"on"`, `"name-only"`, `"user-invocable-only"`,
`"off"`. Absent keys behave as `"on"`. Plugin skills are exempt — manage those through `/plugin`.

Permission rules gate the Skill tool: `Skill(name)` for exact match, `Skill(name *)` for prefix match. Denying `Skill`
outright disables all skills.

## Permissions are per-turn

`allowed-tools` grants for the invoking turn only and clears on the next user message, even though the content stays in
context. Invoking again re-applies it. It does not restrict anything — every tool remains callable and the permission
settings still govern unlisted tools.

**Workspace trust does not gate this field.** A project skill applies its `allowed-tools` even in a `-p` run inside a
folder never trusted, so a repository skill can grant itself broad access. Review `allowed-tools` in checked-in skills
before running Claude Code in a cloned repo.

## Substitutions

- **Arguments** — `$ARGUMENTS`, `$ARGUMENTS[N]`, `$N`, and `$name` from the `arguments` list. Indexed placeholders use
  shell-style quoting. An indexed placeholder with no argument stays literal; a named one expands to empty. Escape a
  literal `$` before a digit or `ARGUMENTS` with a backslash.
- **Paths** — `${CLAUDE_SKILL_DIR}`, `${CLAUDE_PROJECT_DIR}` (v2.1.196+), and in plugin skills `${CLAUDE_PLUGIN_ROOT}`
  and `${CLAUDE_PLUGIN_DATA}`.
- **Session** — `${CLAUDE_SESSION_ID}`, `${CLAUDE_EFFORT}`.

`${CLAUDE_SKILL_DIR}` and `${CLAUDE_PROJECT_DIR}` substitute in **both** the body and Bash rules inside `allowed-tools`.
Using the same variable in both places lets a bundled script run without a permission prompt:

```yaml
allowed-tools: Bash(${CLAUDE_SKILL_DIR}/scripts/render.sh *)
```

`${CLAUDE_PLUGIN_DATA}` is the stable directory for skill-owned state that survives plugin updates — use it for logs a
skill reads back on its next run.

## Dynamic context injection

`` !`command` `` runs before the content reaches the model, and the output replaces the placeholder. Multi-line commands
use a fence opened with ` ```! `. Substitution runs once; injected output is not rescanned. The inline form is
recognized only when `!` starts a line or follows whitespace.

Failure semantics are fail-closed and worth knowing before relying on this:

- **A failed command aborts the whole invocation.** The model never sees the skill. The error reads
  `Shell command failed for pattern "..."`.
- Any non-zero exit fails, except exit 1 from search and comparison commands. Append `|| true` to anything else that
  legitimately exits non-zero.
- **Injected commands never prompt.** A permission check that would ask aborts the invocation:
  `Shell command permission check failed for pattern "..."`. Pre-approve with `allowed-tools`; a matching ask or deny
  rule still aborts.
- `shell: bash` with no bash available fails before any command runs.
- `disableSkillShellExecution: true` in settings replaces each command with
  `[shell command execution disabled by policy]` for user, project, plugin, and additional-directory skills.

## Forked execution

`context: fork` turns the body into a subagent prompt with no conversation history. `agent` picks the type; the agent
supplies system prompt, tools, and permissions. `CLAUDE.md` loads too, except under the built-in `Explore` and `Plan`
agents.

- A backgrounded fork runs with the **narrower background-subagent tool set**. Set `background: false` when a step needs
  a tool outside it.
- A backgrounded fork's edits fall outside session checkpoints, so `/rewind` will not undo them.
- **A reference-content skill under `context: fork` returns nothing useful** — the subagent receives guidelines and no
  task. Fork only skills that carry an explicit instruction.

## Command names and precedence

Personal and project skills take the command from the **directory name**; `name` is only a display label. Plugin skills
take the last command segment from `name`, namespaced by plugin: `my-plugin/skills/review/` with `name: fancy` becomes
`/my-plugin:fancy`.

- Collisions resolve **enterprise > personal > project**, and any of those overrides a bundled skill of the same name.
- A skill beats a `.claude/commands/` file with the same command name.
- A nested project skill becomes directory-qualified — `/apps/web:deploy` alongside the root `/deploy` — rather than
  shadowing it.
- Skills synced from claude.ai lose to every local source, and their name comparison ignores case, spacing, invisible
  characters, fullwidth forms, and dash variants.

## Version gates

Guidance written against an older build goes wrong here:

- **v2.1.196** — `${CLAUDE_PROJECT_DIR}` substitution; `/context` Skills row reports post-budget size.
- **v2.1.218** — `background: false` on forked skills; widened boolean parsing.
- **v2.1.233** — `claude plugin validate`.
- **v2.1.216–v2.1.245** — plugin skill names already carrying their own prefix were double-namespaced. Fixed in
  **v2.1.246**, which also made `/cd` discover project skills in the new directory and fixed plugin installation failing
  when `plugin.json` carried a UTF-8 byte-order mark.
- A leading byte-order mark made a skill silently ignored on builds before v2.1.239. A validator checks the bytes, not
  only the parsed markdown.

Live reload is partial: `SKILL.md` text under watched personal, project, and additional-directory paths updates during
the session, but plugin `hooks/`, `.mcp.json`, `agents/`, and `output-styles/` need `/reload-plugins`.

## Troubleshooting

- **Not triggering** — check the description carries words a user would actually type. Confirm the skill appears in
  `What skills are available?`. Malformed frontmatter loads the body with empty metadata, so `/name` still works while
  automatic routing never fires; `--debug` shows the parse error and `claude plugin validate <dir>` finds the file.
- **Triggering too often** — narrow the description, or set `disable-model-invocation: true` and invoke it by hand.
- **Description cut short** — the listing exceeded its budget. See
  [the description is budgeted](#the-description-is-budgeted-not-merely-capped).
- **Loaded but ignored** — the content is present and the model is choosing other approaches. Strengthen the
  instructions, or move the requirement into a hook where it must hold deterministically.

## Diagnostics beyond the description

**A skill the model never mentions.** Confirm the file is at a discovered location, that `name` matches the directory,
that the frontmatter has a closing `---`, and that the name breaks none of the character rules. Malformed frontmatter
loads the body with empty metadata, so `/name` keeps working while automatic routing never fires. `--debug` shows the
parse error; `claude plugin validate <dir>` finds the file.

A block-scalar description (`>-`, `|`) was once suspected of breaking the skill indexer. Tested on 2026-08-28 against
the installed CLI, a block-scalar description was indexed complete and intact, so a block scalar is not a cause worth
pursuing. Prefer whichever form keeps the text readable.

**A skill excluded by budget.** Symptoms: the skill exists with a valid description but never fires, and the model says
it does not know the skill exists. Diagnose with `/context`, which reports the listing size after the budget applies,
and `/doctor`, which names the biggest contributors. Fixes, in order of leverage: shorten the description; set
low-priority entries to `"name-only"` in `skillOverrides`; set `disable-model-invocation: true` on rarely-used skills to
drop their descriptions from the budget entirely; split an overloaded skill.

**A bundled script that will not run.** Check the executable bit, the shebang, whether the dependencies are installed,
and that the path in the body uses `${CLAUDE_SKILL_DIR}` rather than a relative path. Run it by hand first.

**A reference the model does not open.** Use `${CLAUDE_SKILL_DIR}` for every reference path — a relative path is
ambiguous, and a hardcoded absolute path breaks on another machine. State the read as an instruction with a condition,
not as a bare link.

**A plugin skill that loads twice, or loads stale content.** Plugin skills are discovered from more than one cache
location, and the same plugin present in two of them can register twice — one copy shadowing the other, or an update
appearing not to take effect. Symptoms: duplicate entries for one skill name, or a skill running outdated content after
reinstall. Check for the same plugin directory under the user-level cache, the project-level cache, and the
platform-specific application-support cache. Fix by removing the duplicate, uninstalling before reinstalling, and
bumping the plugin `version` — two copies carrying the same version string may not be detected as a conflict.

## Known defects to design around

- A `context: fork` skill can dispatch with no task payload and silently do nothing, surfacing no error
  (claude-code#82240).
- A skill invoking another skill that carries `disable-model-invocation` fails with
  `Skill <name> cannot be used with Skill tool due to disable-model-invocation`, even though typing `/<name>` works
  (claude-code#79560). Skill-to-skill composition is not a supported path across that flag.
