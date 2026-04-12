# Prompt Techniques for Skills — Extended Depth

Deepening material for the instruction design rules in SKILL.md. Read SKILL.md first — this reference provides research
context, trade-off analysis, and edge case guidance that goes beyond the working-resolution rules.

**Consider invoking the `prompt-engineering` skill** for the full prompt engineering toolkit beyond skill-specific
application.

## Contents

- [Instruction Budget and Applicability](#instruction-budget-and-applicability)
- [Prompt Interference and Conflict Detection](#prompt-interference-and-conflict-detection)
- [CoT Trade-Offs in Persistent Context](#cot-trade-offs-in-persistent-context)
- [Instruction Strengthening Patterns](#instruction-strengthening-patterns)
- [Format Control Techniques](#format-control-techniques)
- [Debugging Instruction Failures](#debugging-instruction-failures)

---

## Instruction Budget and Applicability

Skills inject additional instructions into an already-loaded context. Understanding the budget helps you decide what
belongs in a skill versus what should be left to the harness.

### The Budget Problem

Claude Code's system prompt contains approximately 50 individual instructions before any plugin, skill, or user message
is loaded. Research on frontier models indicates:

- Thinking models: ~150-200 instructions followed with reasonable consistency
- Non-thinking models: significantly lower ceiling with exponential decay (not linear)
- **Uniform degradation**: as instruction count grows, compliance drops across all rules equally — the model does not
  simply ignore "later" instructions, it degrades on all of them

This means skills that add 20+ instructions are burning budget that affects harness rules too, not just their own.

### Applicability Rule

CLAUDE.md research shows: the more instructions in context that are irrelevant to the current task, the worse the model
performs. Skills trigger contextually, but their full content is loaded when triggered.

- Include only instructions that apply to **every** invocation of the skill
- Move task-specific depth to `references/` and instruct the skill to read them on demand (progressive disclosure)
- Avoid code style guidelines in skills — linters enforce those better and for free

### Pointers Over Content

Don't embed file content or code snippets that will become stale. Embed `file:line` references instead. The same
principle applies to skill cross-references: point to the authoritative skill (`prompt-engineering`) rather than copying
its content.

---

## Prompt Interference and Conflict Detection

Skills add behavioral rules to an existing rule set. The Arbiter framework (NLM-sourced research) analyzed the system
prompts of Claude Code (1,490 lines), Codex CLI (298 lines), and Gemini CLI (245 lines) to identify structural
interference patterns. The findings apply directly to skill authoring.

### Interference Patterns Found in Production Agents

**Monolithic growth bugs** — As a system prompt grows via concatenation of plugins and skills, subsystem boundaries
become ambiguous. Example from Claude Code: the TodoWrite mandate ("use VERY frequently") directly contradicts the
commit workflow prohibition ("NEVER use TodoWrite"). Each rule is correct in isolation; together they conflict.

**Scope overlaps** — The same constraint restated in 2-3 locations with subtle wording differences. Claude Code
contained 13 such overlaps. The model resolves these through judgment, not by flagging them as contradictions.

**Priority ambiguities** — Parallel execution guidance coexisting with sequential ordering constraints. The model picks
one interpretation silently.

**Universal tensions** — Autonomy vs. restraint conflicts and precedence hierarchy ambiguity appeared in all three
studied agents. These are not implementation bugs — they are structural properties of rule accumulation.

### The Observer's Paradox

The executing model "smooths over" contradictions — it resolves them using judgment, which prevents it from recognizing
them as contradictions. The model that follows your skill is the worst validator of whether your skill conflicts with
other rules.

**Implication**: test skill instructions with a different model than the executing one, or with a model in a fresh
context without the harness system prompt.

### Conflict-Check Protocol Before Shipping a Skill

When adding behavioral rules to a skill, verify:

1. **New rule vs. harness rules** — does it conflict with Claude Code's built-in directives?
2. **New rule vs. plugin rules** — does it conflict with other installed skills (especially CLAUDE.md and other loaded
   skills)?
3. **Duplicate constraint check** — is this constraint already stated elsewhere with different wording? If yes, either
   remove one or consolidate them.
4. **Priority check** — if two rules conflict in a specific scenario, is the resolution order explicit?

### XML Tags as Scope Boundaries

Explicit section boundaries reduce interference because the model uses tag names to scope rules. A constraint inside
`<constraints>` is less likely to bleed into adjacent behavior than the same constraint in unmarked prose.

Prefer:

```markdown
<constraints>
NEVER include preamble before the JSON output.
</constraints>
```

Over: "Don't include preamble before the JSON output." buried in a paragraph.

---

## CoT Trade-Offs in Persistent Context

SKILL.md states: "Default to declarative. Reserve numbered steps for workflows where order genuinely matters." This
section explains the research behind that rule and when to break it.

### Why CoT Hurts in Skills

Explicit Chain-of-Thought in persistent context (skills, system prompts) creates a **contextual gap** — the distance
between instructions and output grows with each reasoning step. Research findings:

- CoT **diverts constraint attention** — the model over-focuses on high-level content planning and neglects simple
  mechanical rules (word limits, format requirements, negative constraints like "no commas")
- Applying CoT to reasoning models (Claude 3.7+, o-series) causes **double thinking** — amplifies instruction-following
  failures rather than mitigating
- CoT **does help** with structural formatting (valid JSON, XML tags, markdown syntax) and lexical precision — cases
  where reasoning acts as a checklist
- Structuring reasoning as **discrete numbered steps** (a "Thought MDP") enables 20-40% self-correction lift vs.
  unstructured CoT

### Decision Rules for Skill Authors

- **Many mechanical constraints** (format, word limits): avoid CoT entirely
- **Complex multi-step workflow**: use numbered steps (procedural)
- **Varied request types** (coding discipline): no blanket CoT; let model decide
- **Specific reasoning sub-task**: scoped CoT with constraint re-statement after
- **Targets reasoning models** (Claude 3.7+): high-level guidance only ("think thoroughly")

### Constraint Re-Statement Pattern

When a skill needs reasoning for a sub-task, repeat critical constraints after the reasoning block to re-focus
attention:

```markdown
## Analysis Phase

Think through the architecture implications in <thinking> tags.

## Output Phase

After analysis, format your response following these rules:
- Maximum 3 bullet points per section
- Each bullet under 25 words
- No markdown headers in the response body
```

**Key papers:** "When Thinking Fails" (Li et al.); "Scaling Reasoning, Losing Control"; "Diminishing Returns of CoT"
(Meincke, Mollick et al.)

---

## Instruction Strengthening Patterns

When Claude ignores instructions despite clear phrasing, escalate with these patterns — ordered from least to most
aggressive:

1. **Restructure** — move to XML tags at end: `<constraints>ALWAYS filter test accounts</constraints>`
2. **Emphasize** — uppercase key word: "ALWAYS filter test accounts"
3. **Negative space** — state what NOT to do: "Do NOT include explanatory preamble"
4. **Consequence** — state what happens if ignored: "If validation is skipped, the output will corrupt downstream data"
5. **Dual-place** — top + bottom reinforcement: principle at top, checklist at bottom

**Use sparingly.** If everything is emphasized, nothing is. Reserve strong language for rules that repeatedly fail in
testing.

**Prefer restructuring over emphasis.** Moving a constraint to XML tags at the end of a skill is more reliable than
capitalizing words in the middle. Placement beats emphasis.

---

## Format Control Techniques

### Explicit Format with Example

Always specify output format explicitly and include a concrete example:

```markdown
## Output Format

Return results as JSON:
\`\`\`json
{
  "summary": "[1-2 sentences]",
  "findings": ["finding 1", "finding 2"],
  "confidence": "high|medium|low"
}
\`\`\`

Do NOT include markdown formatting around the JSON.
Do NOT add fields beyond those specified.
```

### Prefilling Technique (API Skills)

For skills that produce structured output via the API, describe the prefilling approach:

```markdown
## Response Format

Begin your response with `{` and return valid JSON only.
No preamble, no explanation — just the JSON object.
```

### Negative Format Constraints

Explicitly state what the output should NOT contain. Agents writing skills often omit this because they focus on what
they want:

```
Do NOT wrap JSON in markdown fences.
Do NOT include a "Here's the result:" preamble.
Do NOT add commentary after the structured output.
```

---

## Debugging Instruction Failures

When a skill produces wrong output, diagnose with this list before adding more instructions (which may make the problem
worse):

- **Wrong format** — no format specification or example. Fix: add explicit format + example output
- **Missing details** — instructions too vague. Fix: be specific: "Include X, Y, Z"
- **Ignores constraints** — constraints buried in prose. Fix: move to `<constraints>` tags at end
- **Inconsistent output** — ambiguous or conflicting guidance. Fix: add few-shot examples, resolve conflicts
- **Partial completion** — steps not numbered or unclear. Fix: use numbered sequential steps
- **Correct but verbose** — no negative constraints. Fix: add "Do NOT include..." directives
- **Works sometimes** — critical rule in attention dead zone. Fix: dual-place: top principle + bottom checklist
- **Conflicts with harness** — a different rule wins silently. Fix: run conflict-check protocol; test with fresh context
  or different model

### The Fix Hierarchy

Try fixes in this order — most issues are solved by #1-3:

1. **Restructure** — move content, add XML tags, fix placement
2. **Specify** — add format example, concrete constraints, edge cases
3. **Demonstrate** — add few-shot input/output pairs
4. **Emphasize** — strengthen language (ALWAYS, NEVER, REQUIRED)
5. **Split** — decompose into simpler sub-tasks or separate skills

Adding more text (instructions, constraints, rules) should be the last resort. Research shows adding unnecessary
requirements reduces task success. Try restructuring existing content first.
