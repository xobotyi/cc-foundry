---
name: claude-md
description: >-
  CLAUDE.md instruction quality: writing effective project instructions, diagnosing why Claude ignores rules,
  routing content to the right layer, and systematic improvement. Invoke whenever task involves any interaction
  with CLAUDE.md files — writing, reviewing, auditing, improving, or debugging instruction compliance.
---

# CLAUDE.md Instruction Quality

**CLAUDE.md is a prompt that persists across every session.** All prompt engineering principles apply, but the failure
modes are specific: instructions exist but get ignored, content drifts from reality, and the file grows until nothing
gets followed. The goal is not completeness — it's compliance. A short CLAUDE.md that Claude follows beats a
comprehensive one it ignores.

## What Belongs in CLAUDE.md

CLAUDE.md is for **project-specific instructions that change Claude's default behavior**. If removing an instruction
wouldn't change output quality, it doesn't belong.

**Include:**

- Project structure — key directories, module boundaries, entry points
- Tech stack and tooling — frameworks, test runners, package managers, build tools
- Coding conventions that differ from language defaults — naming, import style, error handling patterns
- Verification workflows — how to run tests, lint, build; what commands to use
- Critical constraints — "never modify X", "always do Y before Z"
- Non-obvious gotchas — things Claude would get wrong without being told

**Exclude:**

- Generic best practices Claude already knows ("write clean code", "use meaningful names", "follow SOLID")
- Language fundamentals ("use strict mode in TypeScript") — these belong in language skills
- Procedural workflows with strict ordering — these belong in skills
- Domain expertise — skills are the right artifact for behavioral rules tied to a specific domain
- Ephemeral state — current sprint goals, in-progress migrations, temporary flags (use memory or tasks)
- Automated behaviors — "whenever X happens, do Y" requires hooks in settings.json, not instructions

### The Layer Routing Decision

Content belongs in the layer where it's most effective:

- **CLAUDE.md** — project identity, structure, conventions, constraints. Read at session start, shapes all work.
- **Skills** — domain expertise, procedural workflows, behavioral rules for specific task types. Loaded on demand.
- **Hooks** — automated enforcement, validation gates, triggered actions. Execute without Claude deciding.
- **Settings** — permissions, env vars, model config. Structural, not instructional.
- **Memory** — user preferences, cross-session context, project state. Recalled when relevant.

**The test:** If it's a rule Claude must follow in every task regardless of domain → CLAUDE.md. If it's a rule for a
specific type of work → skill. If it must happen automatically without Claude's judgment → hook.

## Writing Effective Instructions

### Concrete Over Abstract

Every instruction must be specific enough that Claude can verify compliance.

- **Good:** `Use Vitest for all tests. Test files live in __tests__/ adjacent to source.`
- **Bad:** `Write comprehensive tests for all changes.`
- **Good:** `Run yarn lint && yarn test before committing. Fix all errors.`
- **Bad:** `Ensure code quality before committing.`
- **Good:** `API routes use kebab-case: /api/user-settings, not /api/userSettings.`
- **Bad:** `Follow consistent naming conventions.`

The test: could two different agents reading this instruction produce different behavior? If yes, it's too vague.

### Observable Over Aspirational

Instructions must describe behaviors Claude can actually perform, not qualities it should aspire to.

- **Observable:** `Every public function has a JSDoc comment with @param and @returns.`
- **Aspirational:** `Write thorough documentation.`
- **Observable:** `Prefer composition over inheritance. No class hierarchies deeper than 2.`
- **Aspirational:** `Use good object-oriented design.`

### Brevity = Compliance

Every token in CLAUDE.md competes for attention. The IFScale benchmark (2025) demonstrated a clear negative correlation
between instruction density and compliance — even frontier models drop to 68% accuracy under high instruction load.
Shorter CLAUDE.md files produce higher instruction adherence.

- State each rule once, in the section where it's contextually relevant
- Prefer bullet lists over prose paragraphs — they're faster to scan and harder to miss
- If a section exceeds 15-20 bullet points, it's likely mixing concerns — split by topic or move depth to a skill
- Delete rules that pass the deletion test (removing them doesn't change behavior)

### Prose vs Bullet Lists

Explanatory prose and terse directives serve different purposes. Using the wrong style in the wrong place degrades
compliance.

**Prose (1-3 paragraphs) for project identity only.** A brief "what is this project and why does it exist" section at
the top orients Claude for edge cases where rules don't cover the situation. This is the one place where explaining
_why_ earns its tokens — understanding project intent helps the model make correct judgment calls.

**Bullet lists for all operational rules.** Conventions, constraints, commands, verification workflows — everything
Claude must _do_ goes in bullet lists. Research consistently shows:

- Bullet lists increase signal density — critical rules can't hide inside paragraphs
- Prose introduces rhetorical padding that competes for attention without changing behavior
- Adding "because..." rationale to individual rules is actively harmful — it doubles the token cost of each rule while
  the model rarely needs the justification to follow it
- When the model encounters conflicting prose-wrapped rules, it produces mediocre compromises instead of following
  either rule strictly

**The split:** Top 10-15% of the file can be explanatory prose (project context). The remaining 85-90% should be
structured bullet lists organized by topic.

**Exception:** If a rule is genuinely counterintuitive and Claude would resist following it without understanding why, a
one-sentence rationale after the rule is acceptable. This is rare — most rules don't need justification, they need
clarity.

### Placement Matters

Models follow a U-shaped attention curve: beginning and end are followed most reliably, middle content degrades.

- **Top:** Project identity, structure, tech stack — the "what is this" framing
- **Middle:** Conventions, detailed rules by topic
- **Bottom:** Critical constraints, verification workflow — the "don't forget" reinforcement

For rules that absolutely must be followed, state them early AND reinforce at the end with different phrasing.

## The Multi-Layer Hierarchy

CLAUDE.md files cascade: subdirectory > project root > user global. Later files override earlier ones on the same topic.

- **Global (`~/.claude/CLAUDE.md`)** — personal defaults: communication preferences, tool preferences, workflow habits
  that apply across all projects
- **Project root (`./CLAUDE.md`)** — repo-specific: structure, stack, conventions, constraints. This is the primary
  file. Checked into version control, shared by the team.
- **Subdirectory (`./packages/api/CLAUDE.md`)** — module-specific overrides. Use sparingly — only when a module has
  conventions that genuinely differ from the project root (e.g., a Python service in a mostly-TypeScript monorepo).

**Don't repeat.** If the project root says "use Vitest", don't restate it in every subdirectory. Subdirectory files
should contain only what differs from or adds to the root.

## Diagnosing Instruction Failures

When Claude ignores CLAUDE.md rules, the cause is almost always one of these:

### Buried in Noise

The instruction exists but Claude doesn't follow it. The file is too long, the rule is buried in the middle after
hundreds of tokens of context, and attention has decayed.

**Diagnosis:** The file is painful for a human to skim in under 60 seconds. Critical rules sit inside prose paragraphs
rather than standalone bullets. Multiple sections restate the same thing in different words.

**Fix:** Ruthlessly prune. Move anything Claude already knows by default. Promote buried rules to the top or bottom.
Convert prose to bullet lists.

### Too Vague

Claude produces plausible but wrong output — right code style, wrong location; idiomatic patterns, wrong framework.

**Diagnosis:** Instructions use abstract language ("clean code", "good tests", "consistent naming") without
repo-specific specifics. Architecture descriptions are slogans ("hexagonal architecture") without file paths.

**Fix:** Replace every abstract instruction with a concrete, verifiable directive. Add file paths, command names, and
specific patterns.

### Stale

Claude references files that don't exist, suggests deprecated patterns, or proposes tooling the team abandoned.

**Diagnosis:** CLAUDE.md mentions old frameworks, directory names, or commands. Major architecture shifts never made it
into the file. No one updates it alongside code changes.

**Fix:** Audit against the actual codebase. Remove dead references. Add a convention: update CLAUDE.md alongside
architecture changes, not as a separate task.

### Contradictory

Claude's behavior varies between sessions — sometimes adds tests, sometimes doesn't; sometimes uses one tool, sometimes
another.

**Diagnosis:** Different sections disagree. Copy-paste over months introduced conflicting rules. CI scripts embed
instructions that override CLAUDE.md.

**Fix:** Search for opposing directives on the same topic. Establish one canonical rule per concern. Audit hooks and CI
for shadow instructions.

### Wrong Artifact

An instruction is in CLAUDE.md but should be in a skill, hook, or settings. Claude follows it inconsistently because
CLAUDE.md rules compete for attention across all tasks, while the rule only matters for specific work.

**Diagnosis:** Rules like "when writing tests, always..." or "when reviewing PRs, follow this checklist..." — these are
domain-specific behavioral rules that belong in skills, where they load only when relevant.

**Fix:** Move domain-specific instructions to skills. Move automated behaviors to hooks. Keep only universal project
rules in CLAUDE.md.

## Improvement Workflow

When improving a CLAUDE.md, follow this sequence:

1. **Read the file and the codebase it describes.** Verify that every instruction matches reality — file paths exist,
   commands work, tools are current.
2. **Apply the deletion test.** For each instruction, ask: "If I remove this, would Claude's output quality change?" If
   not, delete it. Pay special attention to generic advice Claude already follows by default.
3. **Check for contradictions.** Search for opposing rules on the same topic. Search hooks and CI configs for shadow
   instructions that conflict.
4. **Assess specificity.** Replace abstract instructions with concrete, verifiable directives. If an instruction can't
   be made concrete, it probably doesn't belong.
5. **Route misplaced content.** Move domain-specific rules to skills, automated behaviors to hooks, ephemeral state to
   memory.
6. **Restructure for attention.** Put project identity at the top. Put critical constraints and verification at the
   bottom. Use bullet lists, not prose.
7. **Verify the result.** The improved file should be skimmable in under 60 seconds and every instruction should be
   something Claude would get wrong without it.

## Critical Rules

- **Deletion test is mandatory.** Every instruction must measurably change Claude's behavior. Generic advice that
  restates defaults wastes tokens and reduces compliance with rules that actually matter.
- **Concrete and verifiable.** If two agents could interpret an instruction differently, it's too vague. Add file paths,
  command names, and specific patterns.
- **Right layer for the content.** Domain expertise → skills. Automated behaviors → hooks. Project-universal rules →
  CLAUDE.md. Misplaced content degrades everything.
- **Maintain alongside code.** CLAUDE.md that drifts from reality is worse than no CLAUDE.md — it produces confidently
  wrong output. Update it when architecture, tooling, or conventions change.
