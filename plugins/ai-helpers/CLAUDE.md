# ai-helpers Plugin

Skills and output styles for engineering AI artifacts: prompts, skills, agents, and output styles.

## Skills

- **`prompt-engineering`** — writing instruction text models read, organized by the surface it lands on: one-shot
  requests, persistent context, tool and schema descriptions, delegated prompts. Covers the instruction budget, wording
  and timelessness rules, formatting choice, and the two behaviors that make reasonable instructions fail — literal
  following and instructions compounding with defaults
- **`skill-engineering`** — author and maintain Agent Skills: the routing metadata that decides activation, proscriptive
  body content over worked examples, splitting by load condition, and evaluation against a no-skill baseline. Carries
  the archetypes, the portable-versus-Claude-Code frontmatter split, host behavior including the listing budget and
  compaction limits, and the supply-chain rules for publishing or installing a skill
- **`subagent-engineering`** — design and maintain subagents: when isolation pays over the main conversation, the
  description that decides delegation, the frontmatter fields that govern a run, and the system prompt the agent wakes
  up with. Carries the false-positive calibration for reviewing agents, the mutating-agent isolation rule, the
  orchestration patterns, and the evaluation and troubleshooting depth
- **`output-style-engineering`** — design output styles injected into the system prompt: choosing the style mechanism
  over CLAUDE.md or a hook, setting `keep-coding-instructions`, verifying injection with a canary, role framed as
  outcome instead of credentials, intent-carrying rules, and voice in rules instead of examples. Carries the file spec
  and built-in catalog, the creation patterns, the scoring dimensions, and the iteration diagnostics
- **`prompt-terser`** — adherence-driven terseness audit for iteratively-edited prompts: same-thought-fewer-words cuts
  with U-curve discipline, narrative-vs-structural distinction, three-check falsification gate (verbosity-type →
  terseness → behavior preservation), and a bracketing preservation inventory that verifies load-bearing literals
  survive the cuts. Surviving narrative is rewritten rather than kept; borderline cuts go by default onto a restore list
  the caller draws from. User-invoked only (`disable-model-invocation`) — its triggers sit inside
  `prompt-engineering`'s, so leaving it in the routing pool only produced a contest it could not win

## Output Styles

- **`ai-engineer`** — collaborative AI engineering persona: direct communication, no sycophancy, Simplified Technical
  English (ASD-STE100) and ubiquitous language, prose-floor formatting, iterative refinement

## Skill Dependencies

```
prompt-engineering (foundation)
    ↑
    ├── skill-engineering (skills are prompts)
    ├── subagent-engineering (agent prompts are system prompts)
    ├── output-style-engineering (styles are system prompts)
    └── prompt-terser (audits existing prompts for drift)
```

When creating skills, subagents, or output styles, invoke `prompt-engineering` for instruction design.

## Plugin Scope

This plugin covers AI artifact engineering within Claude Code:

- Creating and improving prompts for any AI context
- Building Claude Code skills, subagents, and output styles

It does not cover:

- General software engineering workflows (see `the-coder`)
- Language-specific conventions (see language plugins)
- Git workflows (see `git-commit`)

## Conventions

- Skills reference `prompt-engineering` via `<prerequisite>` blocks because all AI artifacts are fundamentally prompts
- Skills with external documentation dependencies maintain `.dev/reference-inventory.json` for doc fetching via CLI
  tools
- For skill structure, routing metadata, packaging, and evaluation — invoke `skill-engineering`
