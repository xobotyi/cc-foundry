# Skill archetypes and scoping

Three shapes cover almost every skill. The archetype decides structure, reference strategy, and instruction style, so
pick it before writing the body.

## Scope sizing

**The litmus test:** describe what the skill does in one sentence without using "and" more than once. If that is not
possible, the scope is too broad.

**Too broad** — indicated by more than three unrelated topic sections, instructions that fall back on "as appropriate"
or "depending on context", and output quality that varies by input type. A "Full-Stack Development" skill covering
frontend, backend, databases, deployment, and testing produces mediocre results everywhere because its instructions
cannot be specific. Fix by splitting into focused skills.

**Too narrow** — indicated by triggering less than once a week, content that could be a single line of instruction, or
coverage of one variation of a broader task. A "Button Component Generator" is not reusable enough to justify the
overhead. Fix by generalizing, or absorbing it into a broader skill.

**Right size** — a clear consistent purpose, predictable output quality, triggered appropriately, and valuable enough to
justify the overhead. "React Component Generator: creates TypeScript components following team conventions, generates
test files, enforces accessibility and typing standards" is one coherent unit.

### Negative triggers

When a skill fires on work a neighbor owns, state the exclusion in the description rather than narrowing the domain
claim:

```yaml
description:
  "Tabular data analysis: statistical patterns in structured datasets. Use when analyzing CSV or Excel files. Not for
  text analysis or database queries."
```

Concrete exclusions beat abstract precision — "not for Vue, Svelte, or vanilla CSS projects" gives the model a boundary
it can apply, where "React-specific" does not.

## Workflow skill

Sequential phases with explicit checkpoints. Almost always user-invoked, because side effects need deliberate timing:
set `disable-model-invocation: true`.

**Reference strategy:** `SKILL.md` carries the complete phase sequence with working-resolution criteria for each phase.
References hold rubrics, validation criteria, or per-phase templates.

**Structural rules:**

- **Name phases explicitly** — "Phase 1", "Phase 2".
- **Give each phase a named artifact** — a plan, a report, a validated output. A phase with no artifact has no
  checkpoint.
- **Place a checkpoint between phases that contain irreversible actions.** State it as a stop condition: "Do not proceed
  until every item is assessed."
- **Write abort conditions as conditions, not suggestions** — "abort if any test fails", never "consider aborting".
- **Give each checkpoint a defined recovery path** for the failure case.
- **Consider `context: fork`** to keep side effects out of the main conversation.

### Verifiable intermediate outputs

A workflow with external side effects verifies each phase before proceeding: run the action, run a verification command,
report the result, then move on. This prevents the failure where the agent reports success and the effect silently did
not happen.

Verification by action type:

- **File writes** — `ls` or `cat` the output
- **Database changes** — select the affected rows
- **API calls** — check the response code and the key fields
- **Git operations** — `git log --oneline -3`, or `git status`
- **Test runs** — parse the exit code **and** scan the output for failures

## Knowledge skill

A complete specification for a tool, format, or API. Everything the agent needs is inline, because a missing rule
produces incorrect output.

**Choose it when** the domain is one specific tool, format, or API; the rules are numerous but all behavioral with no
catalog content; the specification is stable; and omitting any rule breaks correctness.

**Reference strategy:** rare. When references exist they hold example collections or edge-case galleries, never core
rules.

**Organize each concept** as a one-or-two-line framing, then declarative rules, then an inline example only where the
example is shorter than three lines.

> **Deliberately not carried over from the earlier version of this skill:** the guidance that knowledge skills "often
> exceed 500 lines — acceptable when all content is behavioral", and that a 700-line skill beats a 400-line one. Defect
> density rises continuously with size, and compaction preserves only the first 5,000 tokens of a skill, so the tail of
> a long body is not durable regardless of how behavioral it is. Split instead, and accept that a reference may go
> unread — that is a load-condition problem, not a reason to inline everything.

## Coding discipline skill

Conventions and rules for a language, framework, or platform. The most reference-heavy archetype — typically three to
eight references holding API catalogs, comparison tables, and edge-case patterns.

Structure:

- **Philosophy bookends** — three to five principles at the top, one to three at the close.
- **Conventions by topic** — declarative bullet rules, eight to seventeen is typical.
- **An Application section** — see below.
- **An Integration section** — see below.

### The Application section

State the two behavioral modes explicitly:

```markdown
When **writing** code:

- Apply all conventions silently — do not narrate each rule
- If existing code contradicts a convention, follow the codebase and flag the divergence once

When **reviewing** code:

- Cite the specific violation and show the fix inline
- Do not lecture — state what is wrong and how to fix it
```

Without it, the agent narrates every rule application while writing, or fails to apply the conventions at all while
reviewing. The section programs both modes.

### The Integration section

Name the boundary and the precedence: "the `X` skill governs A; this skill governs B. When both apply, B wins for C."
Without it, several discipline skills loaded together force the agent to guess which rule wins — and it will guess
silently.

## Composing skills

A skill can invoke another with `/skill-name` in its instructions.

**Compose when** each sub-skill is independently useful and already tested, the composition is a specific workflow
rather than a concatenation of prompts, and the sub-skills have clear argument contracts.

**Do not compose when** the parts are tightly coupled — that is one workflow skill; when the only motive is avoiding
inline instructions, which buys indirection and nothing else; or when the parent depends on a sub-skill's exact output
format, which is fragile coupling.

Composition across `disable-model-invocation` does not work: a skill invoking a skill that carries that flag fails with
`Skill <name> cannot be used with Skill tool due to disable-model-invocation`, even though a user typing `/<name>`
succeeds.
