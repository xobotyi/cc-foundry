# Prompt Techniques for Skills — Extended Depth

Deepening material for the instruction design rules in SKILL.md. Read SKILL.md first — this reference provides research
context, trade-off analysis, and edge case guidance that goes beyond the working-resolution rules.

**Consider invoking the `prompt-engineering` skill** for the full prompt engineering toolkit beyond skill-specific
application.

## Contents

- [CoT Trade-Offs in Persistent Context](#cot-trade-offs-in-persistent-context)
- [Instruction Strengthening Patterns](#instruction-strengthening-patterns)
- [Format Control Techniques](#format-control-techniques)
- [Security Considerations for Skills](#security-considerations-for-skills)
- [Debugging Instruction Failures](#debugging-instruction-failures)

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

| Skill characteristic                              | CoT recommendation                            |
| ------------------------------------------------- | --------------------------------------------- |
| Many mechanical constraints (format, word limits) | Avoid CoT entirely                            |
| Complex multi-step workflow                       | Use numbered steps (procedural)               |
| Varied request types (coding discipline)          | No blanket CoT; let model decide              |
| Specific reasoning sub-task                       | Scoped CoT with constraint re-statement after |
| Targets reasoning models (Claude 3.7+)            | High-level guidance only ("think thoroughly") |

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

| Level             | Pattern                       | Example                                                             |
| ----------------- | ----------------------------- | ------------------------------------------------------------------- |
| 1. Restructure    | Move to XML tags at end       | `<constraints>ALWAYS filter test accounts</constraints>`            |
| 2. Emphasize      | Uppercase key word            | "ALWAYS filter test accounts"                                       |
| 3. Negative space | State what NOT to do          | "Do NOT include explanatory preamble"                               |
| 4. Consequence    | State what happens if ignored | "If validation is skipped, the output will corrupt downstream data" |
| 5. Dual-place     | Top + bottom reinforcement    | Principle at top, checklist at bottom                               |

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

## Security Considerations for Skills

Skills may process untrusted user input. When a skill handles external data, apply these patterns:

### Input Validation Block

```markdown
## Input Requirements

Before processing, verify:
- File exists and is readable
- File size is under 10MB
- Content does not contain executable code
- File extension matches expected type
```

### Scope Boundary Block

```markdown
## Boundaries

This skill operates ONLY on:
- Files in the current project directory
- Files with extensions: .py, .js, .ts

Do NOT:
- Access files outside project directory
- Execute downloaded code
- Make network requests to unknown hosts
```

Most skills don't need security blocks. Add them when the skill handles:

- User-provided file paths or URLs
- Content from external sources (web scraping, API responses)
- Operations that could affect files outside the project

---

## Debugging Instruction Failures

When a skill produces wrong output, diagnose with this table before adding more instructions (which may make the problem
worse):

| Symptom             | Likely Cause                         | Fix                                          |
| ------------------- | ------------------------------------ | -------------------------------------------- |
| Wrong format        | No format specification or example   | Add explicit format + example output         |
| Missing details     | Instructions too vague               | Be specific: "Include X, Y, Z"               |
| Ignores constraints | Constraints buried in prose          | Move to `<constraints>` tags at end          |
| Inconsistent output | Ambiguous or conflicting guidance    | Add few-shot examples, resolve conflicts     |
| Partial completion  | Steps not numbered or unclear        | Use numbered sequential steps                |
| Correct but verbose | No negative constraints              | Add "Do NOT include..." directives           |
| Works sometimes     | Critical rule in attention dead zone | Dual-place: top principle + bottom checklist |

### The Fix Hierarchy

Try fixes in this order — most issues are solved by #1-3:

1. **Restructure** — move content, add XML tags, fix placement
2. **Specify** — add format example, concrete constraints, edge cases
3. **Demonstrate** — add few-shot input/output pairs
4. **Emphasize** — strengthen language (ALWAYS, NEVER, REQUIRED)
5. **Split** — decompose into simpler sub-tasks or separate skills

Adding more text (instructions, constraints, rules) should be the last resort. Research shows adding unnecessary
requirements reduces task success. Try restructuring existing content first.
