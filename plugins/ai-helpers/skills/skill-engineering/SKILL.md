---
name: skill-engineering
description: "Design and iterate Claude Code skills: SKILL.md structure, description formulas, content architecture, and quality evaluation. Invoke whenever task involves any interaction with Claude Code skills — creating, reviewing, evaluating, debugging, or improving skills."
---

# Skill Engineering

Skills are prompt templates that extend Claude with domain expertise. A skill lives in `skill-name/SKILL.md` with an
optional `references/` directory for deepening material. SKILL.md must be **behaviorally self-sufficient** — an agent
reading only SKILL.md, without loading any references, must be able to do the job correctly. References provide depth,
not breadth. Description triggers activation; instructions shape behavior. Claude sees only `name` and `description` at
startup, then loads full SKILL.md content when triggered.

<prerequisite>
**Skills are prompts.** Before writing or improving a skill, invoke
`prompt-engineering` to load instruction design techniques.

```
Skill(ai-helpers:prompt-engineering)
```

Skip only for trivial edits (typos, formatting).

</prerequisite>

## Route to Reference

- **SKILL.md format, frontmatter rules, directory layout** — [`${CLAUDE_SKILL_DIR}/references/spec.md`] All frontmatter
  fields (open standard + Claude Code extensions), name rules, string substitutions, progressive disclosure mechanics
  (1%/8K budget, 250-char cap), discovery/precedence, instruction budget, SDK behavior differences
- **Creating a skill from scratch** — [`${CLAUDE_SKILL_DIR}/references/creation.md`] Step-by-step creation workflow,
  scope sizing, description writing formula with examples, evaluation-driven development, archetype deep dives with
  structural patterns, pre-delivery checklist
- **Evaluating skill quality (review, audit)** — [`${CLAUDE_SKILL_DIR}/references/evaluation.md`] Scoring rubric (5
  dimensions × 20pts), activation rate benchmarks, trigger keyword density, testing protocol, common issues by score
  range
- **Skill not triggering, wrong output, refinement** — [`${CLAUDE_SKILL_DIR}/references/iteration.md`] Activation
  reliability research (20%→100%), commitment mechanisms, description optimization tiers, output fixes, restructuring
  and splitting guidance
- **Multi-file skills, scripts, subagents, hooks** — [`${CLAUDE_SKILL_DIR}/references/advanced-patterns.md`] Fork
  pattern, workflow skills, composable skills, dynamic context injection, permission scoping, plugin packaging, Agent
  SDK integration, agent teams, skill-scoped hooks, model/effort overrides
- **Debugging activation failures, script errors** — [`${CLAUDE_SKILL_DIR}/references/troubleshooting.md`] Diagnostic
  steps for structure, activation, output, script, reference, token budget, and plugin cache issues. YAML multiline bug
  documentation.
- **Writing persuasive instructions, reasoning** — [`${CLAUDE_SKILL_DIR}/references/prompt-techniques.md`] Instruction
  budget research, prompt interference detection (Arbiter), CoT trade-offs in persistent context, instruction
  strengthening escalation, format control, debugging instruction failures
- **Skill security — authoring and vetting** — [`${CLAUDE_SKILL_DIR}/references/security.md`] Vulnerability taxonomy
  (26.1% of skills affected), consent gap, enterprise vetting checklist, secure authoring rules, red flags quick
  reference

Read the relevant reference before proceeding.

## Description Formula

The description determines when Claude activates your skill. It's the highest-leverage field — poor descriptions cause
missed activations.

```
[What it does] + [When to invoke — broad domain claim with trigger examples]
```

- **What it does** — functional description of the skill's purpose. State what the skill covers concretely, not a slogan
  or tagline.
- **When to invoke** — "Invoke whenever task involves any interaction with X." Claims the domain broadly, then lists
  specific triggers as examples under the broad claim.

**Good — functional description + broad claim:**

```yaml
description: >-
  Go language conventions, idioms, and toolchain. Invoke when task
  involves any interaction with Go code — writing, reviewing,
  refactoring, debugging, or understanding Go projects.
```

**Bad — vague, no trigger surface:**

```yaml
description: Helps with documents
```

### Principles

- **Lead with function, not slogans.** The first sentence must describe what the skill covers concretely. Slogans waste
  description tokens on zero activation value.
- **Claim broadly, then list specifics.** "Invoke whenever task involves any interaction with X — creating, editing,
  debugging" beats "Invoke when creating, editing, or debugging X."
- **Aggressive triggering, graceful de-escalation.** Better to trigger and de-escalate inside the skill than to miss
  activations. Native activation is unreliable (20-50% without enforcement hooks). Design skills to be useful when
  loaded, not to depend on perfect auto-activation.
- **Skill dependencies belong in SKILL.md body, not descriptions.** Prerequisites like "load prompt-engineering first"
  are handled by the skill body — putting them in descriptions wastes trigger space.
- **Philosophy belongs in SKILL.md body.** Guiding principles shape behavior inside the skill — not in the description
  where they have zero activation value.

### Activation Reliability

Native skill activation is unreliable. Measured rates across 250+ sandboxed evaluations:

- No hook / simple instruction hook: ~20-50% activation
- LLM pre-eval hook (API pre-screening): ~80% (can fail on multi-skill prompts)
- Forced-eval hook (explicit YES/NO per skill): ~84-100% (most consistent, zero false positives)
- Manual `/skill-name` invocation: 100%

The forced-eval hook works via a **commitment mechanism**: Claude must evaluate each skill, state YES/NO with reason,
then follow through. Simple passive suggestions are ignored. Description optimization alone cannot break the ~50%
systemic ceiling — hooks are the path to consistent activation.

Description optimization tiers, hook implementation details: see [`${CLAUDE_SKILL_DIR}/references/iteration.md`].

## Content Architecture

SKILL.md must be behaviorally self-sufficient. An agent reading only SKILL.md — without loading any references — must be
able to do the job correctly. References provide depth, not breadth.

### What Goes Where

- **Behavioral rules** → SKILL.md body — agent must follow these during work; can't afford a missed reference read
- **Catalog/lookup content** → references/ — agent reads on-demand for specific lookups
- **Situational content** → references/ — only needed in specific phases
- **Voluminous structural content** → references/ — too large to inline, inherently lookup-oriented

If an agent skipping a reference would produce wrong output, that content is behavioral and belongs in SKILL.md.

### Working-Resolution / High-Resolution

When a reference contains both rules and depth, use a two-resolution split:

- **SKILL.md** — working-resolution: the thesis, core rules, summary that enables correct behavior
- **references/** — high-resolution: detailed rubrics, extended examples, full catalogs, edge case coverage

The agent works correctly at working resolution. References let it zoom in.

### Structured Data Formats

Format choice affects LLM accuracy by up to 16pp on identical content. Apply these rules when creating or reviewing any
skill content:

**Use KV lists** for independent-entry data — route tables, tool references, scoring rubrics, configuration mappings,
hook events, permission modes, model aliases. Each entry stands alone; no cross-row scanning is needed.

**Use markdown tables** only for genuinely 2D comparisons where cross-criteria scanning IS the point — decision
matrices, feature comparisons across two or more alternatives.

**Use numbered lists** only for sequential steps where order matters — "1. Read input → 2. Validate → 3. Output."

**Use bullet lists** for rules, directives, and conventions with no ordering — if items can be reordered without
changing meaning, use bullets.

**The table test:** if removing a column would lose comparative meaning → table. Otherwise → KV list.

**Audit format choices** when creating or reviewing a skill. Converting misused tables to KV lists is a mechanical
improvement with measurable accuracy gain (+8.8pp on lookup tasks).

<example name="table-to-kv-conversion">

**Before (wrong — independent entries in a table):**

```markdown
| Hook Event    | When It Fires          |
|---------------|------------------------|
| PreToolUse    | Before each tool call  |
| PostToolUse   | After each tool call   |
| UserPromptSubmit | On user message     |
```

**After (correct — KV list for independent entries):**

```markdown
- **PreToolUse** — fires before each tool call
- **PostToolUse** — fires after each tool call
- **UserPromptSubmit** — fires on user message submission
```

</example>

<example name="legitimate-table">

**Correct — genuine 2D comparison (removing either column loses meaning):**

```markdown
| Frontmatter                      | User invoke | Claude invoke |
| :------------------------------- | :---------- | :------------ |
| (default)                        | Yes         | Yes           |
| `disable-model-invocation: true` | Yes         | No            |
| `user-invocable: false`          | No          | Yes           |
```

</example>

Full format benchmarks and selection rules: see [`${CLAUDE_SKILL_DIR}/references/spec.md`] and the `prompt-engineering`
skill's structured-data-formats reference.

### Route-to-Reference Lists

When a skill has references, include a route list describing what depth each reference provides. Use
`$\{CLAUDE_SKILL_DIR\}` for all reference paths — it resolves to the skill's absolute directory at load time.

Each entry names the topic, provides the path, and describes the contents — enabling informed read decisions. Without
content descriptions, agents either over-read (wasting context) or skip (missing depth).

## Writing Instructions

Skills are prompts. Apply prompt engineering fundamentals.

### Degrees of Freedom

Match instruction specificity to task fragility:

- **High freedom** — multiple approaches are valid, decisions depend on context
- **Medium freedom** — a preferred pattern exists but some variation is acceptable
- **Low freedom** — operations are fragile, consistency is critical, exact sequence required

### Declarative vs Procedural

- **Declarative** (bullet-list rules, constraints) — for behavioral boundaries, conventions, safety guardrails. Models
  use factual constraints more reliably across varied inputs. Use for the majority of skill content.
- **Procedural** (numbered steps) — for tasks with strict ordering. Cap at ~10-15 steps; decompose beyond that into
  sub-procedures (Hierarchical Task Networks).

**Default to declarative.** Research shows declarative knowledge provides greater performance benefits than procedural
in the majority of tasks.

### Instruction Placement

Models follow a U-shaped attention curve: instructions at the beginning and end are followed most reliably; middle
content suffers from attention decay.

- **Top 20% (primacy zone):** Identity, philosophy, critical constraints
- **Middle:** Detailed rules by topic, route list, examples
- **Bottom 20% (recency zone):** Reinforced critical rules, quality checks

**Dual-placement strategy:** For rules that absolutely must be followed, state them near the top AND reinforce at the
end. Use different phrasing — frame as a principle at the top, as a checklist item at the bottom.

### Every Instruction Must Earn Its Place

Research shows unnecessary requirements reduce task success even when the model can follow them. Every instruction
competes for attention. Before adding a rule, verify the model's default behavior is insufficient — if deleting the rule
doesn't change output quality, remove it.

### State Rules as Positive Directives

State rules as positive directives in the body section where they're contextually relevant: "Use `pipeline()` for stream
composition" — not "Don't use `.pipe()`" in a separate anti-pattern table. Keep an anti-pattern table only when the
"don't" side is genuinely non-obvious from the positive rule.

Instruction strengthening patterns, interference detection, CoT trade-offs: see
[`${CLAUDE_SKILL_DIR}/references/prompt-techniques.md`].

## Skill Archetypes

### Workflow Skill

Sequential phases with clear inputs/outputs and checkpoints. SKILL.md contains the complete workflow; references provide
detailed rubrics, templates, or extended checklists. Use `disable-model-invocation: true` for skills with side effects.

### Knowledge Skill

Complete specification for a tool, format, or API. Everything inline — the agent needs the full spec to do the work.
References are rare; when present, they hold example collections. Knowledge skills often exceed 500 lines — acceptable
when all content is behavioral.

### Coding Discipline Skill

Conventions and rules for a language, framework, or platform. Key patterns: philosophy bookends, declarative rules as
bullet lists (8-17 rules typical), Application section (writing mode vs reviewing mode), Integration section
(relationship to other skills, precedence rules).

Extended structural patterns for all archetypes: see [`${CLAUDE_SKILL_DIR}/references/creation.md`].

## Quick Templates

**Simple skill (no references):**

```markdown
---
name: my-skill
description: >-
  [What it does]. Invoke whenever task involves any interaction
  with [domain] — [specific triggers].
---

# My Skill

## Instructions

[Clear, imperative steps or declarative rules]

## Examples

**Input:** [request]
**Output:** [expected result]
```

**Skill with references:**

```markdown
---
name: my-skill
description: >-
  [What it does]. Invoke whenever task involves any interaction
  with [domain] — [specific triggers].
---

# My Skill

[Philosophy or purpose statement]

## References

- **[topic]** — `$\{CLAUDE_SKILL_DIR\}/references/[file].md`
  [type of depth: tables, examples, patterns]

## [Topic Sections]

[Working-resolution rules — complete behavioral spec]

[Pointers to references for extended examples, lookup tables]
```

## Security

Skills execute with system-prompt authority — Claude treats SKILL.md as trusted instructions. Research shows 26.1% of
skills in the wild contain vulnerabilities (14 patterns across prompt injection, data exfiltration, privilege
escalation, and supply chain categories).

**When authoring skills:**

- Never embed secrets in SKILL.md, references, or scripts
- Set `allowed-tools` to the minimum required — don't claim `Bash` if `Read` suffices
- Sanitize user-supplied content before interpolating into generated prompts or commands
- Pin all dependencies with exact version constraints
- Prefer instruction-only skills over script-bundled when possible (scripts are 2.12× more likely to contain
  vulnerabilities)

**When vetting third-party skills:** read all content including scripts, verify behavior in sandbox, check for
adversarial instructions and exfiltration patterns.

Full vulnerability taxonomy and enterprise vetting checklist: see [`${CLAUDE_SKILL_DIR}/references/security.md`].

## Critical Rules

- **Deletion test before adding.** Every rule competes for attention. Before adding a rule to a skill, verify the
  model's default behavior is insufficient. If removing the rule doesn't change output quality, it shouldn't exist.
- **References must not duplicate SKILL.md.** References provide genuinely different depth: detailed rubrics, extended
  examples, full catalogs, comparison tables, edge case coverage. Not restated rules.
- **Description is activation, not documentation.** Every token in the description must increase activation probability.
  Slogans, philosophy, cross-skill dependencies, and filler verbs have zero activation value.
- **Declarative by default.** Use numbered steps only for workflows with strict ordering. Bullet-list rules for
  everything else.
- **One skill, one purpose.** If scope creeps, split. Broad skills produce mediocre results because instructions compete
  for attention.
- **Check for interference.** New rules can conflict with existing harness directives or other loaded skills. Test in
  fresh context; the executing model smooths over contradictions silently (Observer's Paradox).

## Quick Checks

Before deploying:

- [ ] Description leads with what the skill does (not a slogan)
- [ ] Description claims domain broadly ("whenever task involves")
- [ ] Description lists specific trigger keywords as examples
- [ ] SKILL.md is behaviorally self-sufficient — no critical rules only in references
- [ ] References contain only deepening material (examples, catalogs, how-tos)
- [ ] Route-to-Reference list describes each reference's contents (if references exist)
- [ ] KV lists for lookups/routes, tables only for genuinely 2D comparisons
- [ ] Degrees of freedom matched to task fragility (high/medium/low)
- [ ] Declarative style for constraints/conventions, procedural only for ordered workflows
- [ ] Instructions use imperative voice
- [ ] Instructions structured (XML tags, numbered steps/rules)
- [ ] At least one input/output example (few-shot) for generative skills
- [ ] Critical rules in top 20% and/or bottom 20% (not only in middle)
- [ ] Every instruction earns its place (deletion test: removing it changes output)
- [ ] No secrets in SKILL.md, references, or scripts
- [ ] Under 500 lines (exceeding is acceptable when all content is behavioral)
- [ ] Name matches directory (lowercase, hyphens)

## Related Skills

- `prompt-engineering` — load first for instruction design techniques (skills are prompts)
- `subagent-engineering` — skills and subagents complement each other; skills run inline, subagents run in isolation
- `output-style-engineering` — output styles replace the system prompt; skills extend it
- `claude-code-sdk` — consult for SKILL.md frontmatter fields, plugin layout, and invocation control details
