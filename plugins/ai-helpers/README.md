# ai-helpers

Claude Code plugin for engineering AI artifacts: prompts, skills, agents, and output styles.

## The Problem

**Prompts are deceptively hard.** Instructions like "be helpful" or "write good code" don't constrain behavior — the AI
fills gaps with defaults that may not match your intent. Without explicit structure, examples, and format
specifications, prompts produce inconsistent results.

**Skills don't activate reliably.** You write a skill, but Claude ignores it. The description doesn't match how users
phrase requests, trigger keywords are missing, or the frontmatter is misconfigured. Vague descriptions like "helps with
X" waste the highest-leverage field.

**Agents overstep or quit early.** Without clear scope boundaries, subagents either try to handle everything (exceeding
their mandate) or bail too early (leaving work incomplete). Tool restrictions and termination conditions need explicit
design.

**Output styles revert to defaults.** You want a specific persona, but Claude falls back to base behavior under
pressure. The style instructions compete with the system prompt instead of claiming precedence over it, or the voice is
described too loosely to hold.

## The Solution

This plugin encodes best practices for each AI artifact type. Each skill follows a router pattern: SKILL.md provides
core instructions and routes to `references/` for detailed content.

All skills build on `prompt-engineering` fundamentals — because every AI artifact is ultimately a prompt. The
`claude-code-sdk` skill provides reference documentation for Claude Code's extensibility APIs (plugins, hooks, MCP,
settings).

The `ai-engineer` output style provides a collaborative persona optimized for artifact work: direct communication,
minimal filler, iterative refinement focus.

## Installation

```
/plugin marketplace add xobotyi/cc-foundry
/plugin install ai-helpers
```

## Skills

### prompt-engineering

Prompt design techniques for LLMs: structure, examples, reasoning patterns, optimization strategies. Covers zero-shot,
few-shot, chain-of-thought, Claude-specific features (adaptive thinking, effort, prompt caching, system prompts), and
per-model behavioral prompting (Claude Fable 5 / Opus 4.8 / Sonnet 5, GPT-5.x).

**Use when:** Crafting any AI instructions, debugging unexpected behavior, improving response quality, or working with
prompts in any context.

### skill-engineering

Design and iterate Claude Code skills. Covers SKILL.md format, description optimization, router pattern, reference
organization, and activation debugging.

**Use when:** Creating new skills, debugging activation failures, restructuring existing skills, or evaluating skill
quality.

### subagent-engineering

Claude Code subagent lifecycle: creation, configuration, evaluation, and troubleshooting. Covers agent teams, worktree
isolation, background execution, Agent SDK integration, subagent-scoped hooks, and persistent memory.

Two failure modes get explicit treatment. Reviewing and auditing agents drift toward manufacturing findings, because an
empty report reads to them like a failed run — so the skill carries the calibration that reverses it: name the clean
audit as a success, don't scale findings to input size, split the burden of proof between bright-line rules and judgment
calls, and carry evidence for any claim of absence. Separately, an agent whose method mutates the tree — a test auditor
running negative controls, anything that edits and reverts to prove a point — needs its own worktree and a
restore-and-verify rule, because a crash mid-mutation strands a broken tree the caller believes is clean.

**Use when:** Creating custom agents, designing agent teams, debugging agent behavior, or deciding if a subagent is the
right solution for a task.

### output-style-engineering

Design output styles for Claude Code — the only file-based mechanism that removes parts of the default system prompt and
gets harness-reinforced adherence. Covers frontier-era authoring (role as outcome instead of persona theater,
intent-carrying rules, voice in rules instead of examples, subtraction over scaffolding), non-coding domain patterns
(business analysis, content strategy, research), an evaluation framework with dimensional scoring including scaffolding
debt, and iteration diagnostics from silent non-injection to overtriggering.

**Use when:** Building styles, customizing voice and tone, creating domain-specific response patterns, evaluating style
quality, migrating styles to a new model generation, or debugging styles that misfire or silently fail to load.

### prompt-terser

Adherence-driven terseness audit for iteratively-edited prompts and skills. Same-thought-fewer-words cuts reduce
attention competition and improve model compliance — token reduction is a side effect, not the goal. Three-phase
workflow (wording substitutions, format cleanup, structural cuts) bracketed by a preservation inventory: load-bearing
literals (triggers, commands, paths, numbers, error messages, security rules) are enumerated before cutting and verified
verbatim after. A three-check falsification gate (verbosity-type → terseness → behavior preservation) distinguishes
narrative bloat from load-bearing structural verbosity (rubrics, checklists), and hard cut vetoes protect trigger
synonyms, superseding corrections, and concrete lists from "safe-looking" merges. Catches drift patterns including
rationale stacking, duplicated constraints, and ambiguity-zone paragraphs (~20-40 word narrative blocks at the
worst-case length for adherence).

Two defaults keep the audit from turning into line editing. Narrative content that passes the gate is rewritten at
roughly half length or fused into a denser home rather than kept as written, truth-conditions preserved exactly — and
structural content is exempt, since compressing a rubric row is how a decision table becomes an ambiguity-zone
paragraph. And a borderline narrative cut goes, onto a restore list the caller draws from, because keeping "to be safe"
is the drift the skill exists to reverse. Calibration is measured against the narrative portion alone: a third or more
comes out, and under 20% means sentences were edited where paragraphs should have been questioned.

**Use when:** Auditing or tightening an existing prompt that has accumulated bloat through many edits, or when adherence
to prompt rules feels unreliable and verbose wording may be competing for attention — skills, system prompts, output
styles, or agent instructions. Not for newly authored content (use `prompt-engineering` instead).

### claude-code-sdk

Reference documentation for Claude Code extensibility: plugins, skills, hooks, MCP servers, output styles, settings,
CLAUDE.md, and subagents.

**Use when:** Building Claude Code extensions, understanding configuration hierarchy, debugging integration issues, or
consulting API documentation.

## Output Styles

### ai-engineer

Collaborative peer persona for AI artifact work. Direct communication without sycophancy, conclusions first, challenges
ideas freely. Dense register with calibrated exceptions, an objection raised only when it changes what you should do,
and vertical planning — tracer-bullet first, expand components in vertical passes; rejects horizontal "finish all of one
layer before the next" decomposition. Optimized for iterative refinement with peer-level interaction.

Its terseness rules govern two channels: what Claude says to you, and what it writes into the artifact. Artifacts state
the rules that hold now, so a skill or style never accumulates "previously this said X" notes or a changelog section.
That history lives in git and the release notes.

A **Language Contract** section carries two absolute rules, held outside the style's own priority hierarchy so brevity
can never trade them away: write to ASD-STE100 Simplified Technical English, and use ubiquitous language — one name per
concept, taken from the domain or the artifact under work and carried unchanged through prose, headings, and examples.
Technical names and verbs stay exempt from STE's vocabulary, so identifiers and domain terms are never watered down.
Where a project already fixed a name, that name wins.

**Activate:** `/config` → **Output style** → **AI Engineer** (or set `"outputStyle": "AI Engineer"` in settings)

## Skill Relationships

```
prompt-engineering (foundation)
    ↑
    ├── skill-engineering (skills are prompts)
    ├── subagent-engineering (agent prompts are system prompts)
    ├── output-style-engineering (styles are system prompts)
    └── prompt-terser (audits existing prompts for drift)

claude-code-sdk (reference)
    ↑
    └── All engineering skills consult for implementation details
```

## License

MIT
