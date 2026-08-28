---
name: claude-md
description: >-
  Write and maintain CLAUDE.md and `.claude/rules/` files: which layer loads when, what content belongs in each, and
  why a stated rule gets ignored.
when_to_use: >-
  Invoke whenever a CLAUDE.md or a `.claude/rules/` file is touched at all — creating, editing, auditing, trimming, or
  choosing which layer a rule belongs in. Also invoke on the symptoms: a rule in the file gets ignored, Claude cites a
  path that does not exist, behavior differs between sessions, an instruction disappears after `/compact`, or a rule
  never loads inside a monorepo package.
compatibility: Uses Claude Code frontmatter beyond the Agent Skills spec (when_to_use)
---

**CLAUDE.md is delivered as a user message after the system prompt, not as configuration.** It is read and weighed,
never enforced — which is why a rule that must hold every time belongs in a hook or a permission, and why the goal here
is compliance, not completeness. A short file that gets followed beats a full one that gets ignored.

<prerequisite>
A CLAUDE.md is instruction text. Invoke `prompt-engineering` for the wording, the instruction budget, and the
timelessness rules that govern every line written here. This skill covers only what is specific to the CLAUDE.md and
`.claude/rules/` artifacts — what loads when, which layer owns which content, and why a stated rule gets ignored.
</prerequisite>

## What Loads, and When

Routing and trimming decisions are wrong whenever the loading model is wrong. Establish this first.

- **CLAUDE.md and CLAUDE.local.md load at launch from the working directory and every directory above it.** Content is
  ordered from the filesystem root down, so the file closest to the launch directory is read last. Within one directory,
  `CLAUDE.local.md` is appended after `CLAUDE.md`.
- **Files in subdirectories below the working directory do not load at launch.** They load when Claude reads a file in
  that directory. A rule that must hold from the first turn cannot live in a nested CLAUDE.md.
- **Layer scope, broadest to narrowest** — managed policy (`/Library/Application Support/ClaudeCode/CLAUDE.md` on macOS,
  `/etc/claude-code/CLAUDE.md` on Linux and WSL, `C:\Program Files\ClaudeCode\CLAUDE.md` on Windows) → `~/.claude/` →
  the project (`./CLAUDE.md` or `./.claude/CLAUDE.md`) → `./CLAUDE.local.md`. Managed policy cannot be excluded.
- **Load order is not precedence.** Every discovered file is concatenated; when two layers contradict, Claude may follow
  either. Reconcile the conflict rather than relying on "later wins".
- **`@path` imports expand at launch**, up to four hops deep. Splitting a large CLAUDE.md into imports buys organization
  and never buys context. A path inside backticks stays literal instead of importing.
- **A CLAUDE.md over 4 MiB is skipped entirely** — no warning in the file itself.
- **Block-level HTML comments are stripped before injection.** Notes for human maintainers cost no tokens.
- **`claudeMdExcludes` skips files by absolute-path glob**, set at any settings layer, with arrays merging across
  layers. It is the monorepo tool for another team's files, and it excludes their rules along with their CLAUDE.md.
- **Verify what actually loaded with `/context`**, under **Memory files**. The `InstructionsLoaded` hook logs each file
  as it loads, which is how a lazily-loaded rule is debugged.

### Rules Files

- **Every `.md` under `.claude/rules/` is discovered recursively.** Subdirectories such as `frontend/` and `backend/`
  are a supported layout, and nested `.claude/rules/` directories deeper in the tree load on demand. Centralizing every
  rule at the repository root is a governance choice, never a requirement.
- **A rule without `paths` loads at launch at the same priority as `.claude/CLAUDE.md`.** It costs exactly what a
  CLAUDE.md line costs.
- **A rule with `paths` triggers when Claude reads a matching file**, not on every tool use. This is the one mechanism
  that genuinely reduces baseline context.
- **`~/.claude/rules/` loads before project rules**, so a project rule outranks a personal one on the same topic.
- **Plugins cannot ship rules.** The plugin component set has no rules entry, and a CLAUDE.md at a plugin root is not
  loaded as project context. Conventions that must reach every install go in a skill; a rule is written by hand in the
  consuming project.

### After Compaction

- **The project-root CLAUDE.md survives** — it is re-read from disk and re-injected.
- **Nested CLAUDE.md files and `paths`-scoped rules do not.** They reload when Claude next reads a file they apply to.
- **An instruction given only in conversation is gone.** Write it into CLAUDE.md to make it persist.

## Routing Content to a Layer

- **CLAUDE.md** — project identity, capability map, conventions, constraints. Applies to every task regardless of
  domain.
- **`.claude/rules/`** — conventions scoped to a file type or a path, via glob `paths`. Lighter than a skill, no
  SKILL.md ceremony.
- **Skills** — procedural workflows and domain expertise for one type of work. Loaded on demand.
- **Hooks** — anything that must happen without Claude's judgment. Execute at fixed lifecycle events.
- **Settings** — permissions, environment variables, model configuration. Structural, not instructional.
- **Auto memory** — user preferences and cross-session context Claude writes for itself.

**The test:** universal rule → CLAUDE.md. Scoped to file types or paths → `.claude/rules/`. Scoped to a kind of work →
skill. Must happen automatically → hook.

**Prefer the path fence.** When one glob covers exactly the files a rule governs, put the rule in `.claude/rules/` with
`paths` — not once CLAUDE.md grows too long, but on the way in, while it is still short. A scoped rule is the only layer
that costs nothing until it is relevant, and it arrives in context beside the file it applies to instead of competing
for attention with every unrelated rule from the first turn.

**Keep the rule in CLAUDE.md when the fence leaks** — the glob matches files the rule does not govern, or misses files
it does — or when the rule must hold before Claude reads any file. A fence that needs a growing list of patterns to stay
accurate is leaking; state the rule once at the root instead.

**Instructions are not enforcement.** Models route around soft constraints stated as prose — working from a different
directory to dodge a path restriction, rephrasing to dodge a wording rule. Anything that must never happen goes in
permissions, sandbox configuration, or a hook. CLAUDE.md states working defaults.

**Where the record goes instead.** Past work → commit messages and the tracker. A lesson from one incident → memory,
promoted to a CLAUDE.md rule only on recurrence. A decision → one present-tense rule here, with any why longer than a
clause moved to an ADR the rule links to.

## What Belongs in CLAUDE.md

Two tests, both mandatory. If removing an instruction would not change output quality, cut it. If Claude can infer it by
reading the codebase, cut it.

**Include:**

- Capability map — which module owns which functionality, and where new code of each kind goes. An ownership map, never
  a directory tree
- Stack and tooling — frameworks, test runners, package managers, build tools
- Conventions that differ from language defaults — naming, import style, error handling
- Decisions as present-tense rules, with at most a one-clause causal why
- Verification workflow — the exact commands for test, lint, and build
- Critical constraints — the "never modify X", "always do Y before Z" rules
- Gotchas Claude gets wrong without being told

**Exclude:**

- Generic best practices and language fundamentals — these are defaults, or they belong in a language skill
- Procedural workflows with strict ordering — these belong in a skill
- Ephemeral state — sprint goals, in-flight migrations, temporary flags. These belong in the tracker
- Project history — changelogs, session logs, migration narratives, abandoned approaches. A described abandoned approach
  reads as an available option and gets resurrected
- Directory trees and file listings — anything reproducible with `ls`
- Automated behaviors — "whenever X happens, do Y" is a hook, not an instruction

## Writing the File

- **Every instruction must be concrete enough that two agents cannot diverge on it.** Exact paths, exact command names,
  exact patterns. An instruction that resists being made concrete does not belong.
- **Present tense only.** A CLAUDE.md states what is true, never how the project got here: "we migrated from REST to
  gRPC" becomes "services communicate over gRPC".
- **Temporal markers rot silently** — "recently", "new", "now uses", "as of March". Delete the marker or the whole line.
- **Prose only in the identity block**, the top 10–15% of the file. Everything operational is bullets; a critical rule
  cannot hide inside a paragraph, and prose-wrapped rules that conflict produce a compromise instead of either rule.
- **A contestable decision carries one causal clause** — "IDs are UUIDs — prevents enumeration, enables offline
  generation". It stops the model from "fixing" the decision. A mechanical rule carries none; explaining `yarn lint`
  doubles its cost and changes nothing.
- **Lists over tables.** Commands, conventions, and capability maps are independent entries. A table earns its place
  only when rows are compared across columns. Numbered lists only where order is the content.
- **Placement follows the U-shaped attention curve** — identity and capability map at the top, conventions in the
  middle, verification and critical constraints at the bottom. State a truly critical rule at both ends, worded
  differently each time.
- **State each rule once, in the section that owns the topic.** A nested CLAUDE.md carries only what differs from the
  root; restating a root rule produces contradictory signals, not emphasis.

## Size and Trimming

Target under 200 lines per file — past that, adherence measurably drops. Treat 200 as the trigger for a classification
pass, never as a cap to cut to: a file that stays above it because every block survived the pass is correct.

`/doctor` proposes trims for a checked-in CLAUDE.md (v2.1.206 and later): it cuts what Claude can derive from the
codebase — directory layouts, dependency lists, architecture overviews — and keeps pitfalls, rationale, and conventions
that differ from tool defaults.

Classify each block when trimming by hand:

- **Keep** — used in most sessions, safety-critical, easy to violate, or security-sensitive
- **Move to `.claude/rules/`** — a path- or filetype-scoped convention. With `paths` frontmatter it stops costing
  baseline context
- **Extract to a skill** — a "when doing X, follow these steps" block
- **Remove** — stale content, rules Claude follows by default, one rule restated in different words, rationale that
  changes no behavior

**Three exceptions stay regardless of how rarely they apply:** safety-critical content (violating it loses data,
breaches security, or breaks production), easy-to-violate content (Claude gets it wrong without the reminder), and
security-sensitive content (authentication, authorization, secrets, data exposure). The goal is working efficiency, not
a line count — moving a critical rule into a rarely-loaded file is a regression.

**Trim when** the file passes 200 lines, Claude ignores rules that are present, unrelated domains share one file, or a
human cannot skim it in under 60 seconds.

## Diagnosing an Ignored Rule

Work down this list. The first two causes are mechanical and account for most reports.

- **Never loaded** — the rule lives in a nested CLAUDE.md or a `paths`-scoped rule that has not matched a file, in a
  directory outside the launch path, or in a file over 4 MiB. It may also be excluded by `claudeMdExcludes`. Confirm
  with `/context` under **Memory files**, or the `InstructionsLoaded` hook. Fix by moving the rule to a layer that loads
  when it is needed.
- **Vanished mid-session** — compaction dropped a nested CLAUDE.md, a `paths`-scoped rule, or an instruction that only
  ever existed in conversation. Fix by writing it into the project-root CLAUDE.md, which is re-read from disk.
- **Buried in noise** — the file is too long and the rule sits in the middle. The signal is a file a human cannot skim
  in 60 seconds, critical rules inside prose, and several sections restating one thing. Fix by pruning, then promoting
  the rule to the top or the bottom.
- **Too vague** — plausible but wrong output: right style, wrong location; idiomatic patterns, wrong framework. The
  signal is abstract language and architecture named as a slogan with no paths. Fix by replacing every abstraction with
  a path, a command, or a pattern.
- **Stale** — Claude cites files that do not exist or tooling the team dropped. Past-tense narration and temporal
  markers are the early warning. Fix by auditing against the codebase, then updating the file in the same change as the
  architecture, never as a separate task.
- **Contradictory** — behavior varies between sessions because two layers disagree, or a hook or CI script carries a
  shadow instruction. Fix by establishing one canonical rule per concern across all layers.
- **Wrong artifact** — a rule shaped "when writing tests, always…" competes for attention across every task while
  mattering in few. Fix by moving it to a skill, a hook, or a rules file.

## Creating a CLAUDE.md

Start at 50–100 lines and iterate from observed failures. A file written from static analysis is a starting point; the
real content comes from where Claude gets things wrong during work.

Detect the stack from config files (`package.json`, `go.mod`, `Cargo.toml`, `pyproject.toml`, `Makefile`, CI and linter
configs). Map capabilities to locations. Identify the conventions that differ from language defaults — those are the
only ones worth writing. Apply the deletion test before delivering.

`/init` generates a starting file, and suggests improvements rather than overwriting when one already exists.

Read [`${CLAUDE_SKILL_DIR}/references/scaffold.md`] when creating a file from scratch or restructuring an existing one —
it carries the canonical section order with worked examples, the creation workflow, and the monorepo layouts.

## Application

When **writing or editing** a CLAUDE.md:

- Edit surgically. Add a rule into the section that already owns its topic; wholesale rewrites and section reshuffles of
  a working file are defects, not cleanups
- Never delete or reword a rule without first verifying against the code that it is stale
- Apply the conventions silently — do not narrate each rule as it is applied

When **auditing** a CLAUDE.md:

- Read the file end to end before judging it. A premise is carried by sentences no search term predicts, and an audit
  assembled from grep hits reports clean on every line it never opened
- Verify each instruction against the codebase: paths exist, commands run, tools are the ones in use
- Cite the specific line and give the replacement inline. Do not lecture
