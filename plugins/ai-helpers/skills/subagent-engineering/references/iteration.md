# Iterating on Subagents

Improving existing subagents based on observed behavior — targeted prompt fixes to full redesigns.

---

## Improvement Workflow

```
1. Identify → What behavior is wrong?
2. Diagnose → Root cause (description? prompt? tools? scope?)
3. Hypothesize → One change that should fix it
4. Apply → Change only that variable
5. Verify → Run same task, compare output
6. Commit or revert
```

Change one thing per iteration — changing multiple variables makes it impossible to know what helped.

---

## Description Optimization

The `description` field controls when Claude delegates — the highest-leverage field to tune. Wrong descriptions cause
all trigger problems.

**Trigger accuracy formula:**

- Trigger conditions: _what kind of task / context should invoke this agent_
- Scope exclusions: _what this agent does NOT handle_
- Proactivity signal: include `"Use proactively"` or `"Use when"` to encourage automatic delegation

**Under-triggering (agent ignored):**

```yaml
# Too narrow — only fires on exact PEP8 mention
description: "Reviews Python code for PEP8 compliance"

# Fixed — broader trigger, explicit proactivity
description: >
  Code review specialist for quality, style, and best practices.
  Use proactively after writing or modifying any code.
```

**Over-triggering (delegates for unrelated tasks):**

```yaml
# Too vague — fires for anything code-related
description: "Helps with code"

# Fixed — scoped with explicit exclusion
description: >
  Security vulnerability scanner for authentication and authorization code.
  Use when reviewing auth modules or after security-related changes.
  NOT for general code review.
```

**Conflicting agents (wrong agent chosen):**

When multiple agents overlap in scope, Claude picks unpredictably. Add exclusions to each:

```yaml
# In security-reviewer.md
description: "Security review. NOT general quality review."

# In code-reviewer.md
description: "General code quality review. NOT security audits — use security-reviewer for those."
```

---

## Prompt Refinement Techniques

### Strengthen: Add What's Missing

Add explicit instructions for observed gaps without restructuring:

**Missing output format** — add a concrete template:

```markdown
## Output Format

### Critical Issues

- [Issue]: [Location] — [Fix]

### Warnings

- [Issue]: [Location] — [Fix]

### Suggestions

- [Suggestion]: [Location]
```

**Incomplete execution** — add ordered steps and a completion gate:

```markdown
When invoked, follow these steps IN ORDER:

1. Run `git diff` to identify changed files
2. Read each changed file
3. Apply the review checklist
4. Compile findings by severity
5. Return formatted report

Before returning, verify:

- [ ] All changed files reviewed
- [ ] Each checklist item addressed
- [ ] Specific fixes provided for Critical items
```

**Scope creep** — add explicit constraint block and restrict tools:

```yaml
tools: Read, Glob, Grep
```

```markdown
## Constraints

- DO NOT modify any files
- DO NOT make implementation decisions
- ONLY report findings — fixes are the caller's responsibility
```

**Context bloat** — add synthesis instruction and cap return length:

```markdown
## Efficiency

- Use Grep to locate relevant code before reading entire files
- Stop once you have enough evidence for each checklist item
- Synthesize findings into actionable summary

## Return

Concise summary (max 400 words):

- Key findings (bullet list)
- Recommended actions
- Files examined (names only, not contents)
```

### Restructure: Reorder for LLM Attention

Models weight earlier content more heavily. If an instruction is consistently ignored, move it earlier in the system
prompt — before examples, after the role declaration.

**Restructuring checklist:**

- Role and primary purpose → top
- Critical constraints → immediately after role
- Workflow steps → middle
- Output format → before examples
- Examples → last

### Split: Decompose an Overloaded Agent

When an agent reliably fails on a subset of tasks or produces inconsistent quality, the root cause is often scope
overload. Split into two focused agents:

```
# Before: one agent doing too much
security-and-quality-reviewer.md

# After: two focused agents
security-reviewer.md   — auth/security scope, read-only tools
quality-reviewer.md    — style/patterns scope, broader tools
```

Each agent's description now has clear, non-overlapping triggers. Claude can pick the right one.

---

## A/B Testing

Test a change before committing it by running both versions on identical tasks.

**Setup:**

```markdown
---
name: code-reviewer-v2
description: "Code reviewer (experimental). Compare against code-reviewer before adopting."
---
```

**Process:**

1. Identify a representative task (one where current agent underperforms)
2. Run `code-reviewer` — record output
3. Run `code-reviewer-v2` — record output
4. Compare on: trigger accuracy, output completeness, format, conciseness
5. If v2 wins on all dimensions → rename to `code-reviewer`, delete v2
6. If mixed results → iterate on v2 before deciding

**Keep variants in git** rather than in file copies. Use branches or commits to track what changed and why. File copies
accumulate and become confusing.

---

## Version Control for Agent Definitions

Agent definitions are code — treat them as such. Useful patterns:

**Inline changelog (lightweight):**

```yaml
---
name: code-reviewer
description: "..."
# version: 2.1
# changelog:
#   2.1 - Added security checklist, narrowed description scope
#   2.0 - Restructured: role → constraints → workflow → format
#   1.0 - Initial
---
```

**Branch-per-experiment (preferred for significant changes):**

```bash
git checkout -b agents/code-reviewer-v3
# edit .claude/agents/code-reviewer.md
# test
git commit -m "agents: restructure code-reviewer prompt order"
```

This lets you compare diffs, revert cleanly, and review changes with collaborators.

---

## Fix vs. Rebuild Criteria

**Fix (iterate)** when:

- Core concept is valid, execution is off
- One or two specific symptoms to address
- Description or output format is the likely cause
- The agent works for 70%+ of cases

**Rebuild** when:

- Fundamental scope is wrong (agent tries to do too much)
- Requirements changed enough that the system prompt fights the new goal
- Multiple unrelated symptoms — suggests architectural mismatch
- Accumulated patches have made the prompt contradictory

**Split** when:

- Agent handles two distinct task types inconsistently
- Different tool restrictions would be ideal for each type
- Description can't accurately scope both use cases simultaneously

When rebuilding, start from spec, not from the existing prompt. Carry over only tested patterns (output format,
checklists) — not the overall structure.

---

## Fan-out Iteration Pattern

When applying a prompt change across many similar agents (e.g., migrating a template), tune on 2–3 instances before
deploying to all:

```bash
# Step 1: Apply change to 2-3 representative agents
# Step 2: Run same evaluation tasks on each
# Step 3: If consistent improvement → apply to all remaining agents
# Step 4: If mixed → diagnose and adjust prompt before continuing
```

This is the same principle as large-scale code migration: prototype → verify → scale. Avoid "artisanal" per-agent tuning
when the same pattern applies broadly.

---

## Parallel Session Bias Avoidance

Avoid reviewing an agent change in the same session where you wrote it — writing context biases judgment toward "this
looks right."

**Pattern:**

```
Session A (Author): Writes the new agent prompt, commits
Session B (Reviewer): Opens fresh session, runs agent against test tasks, evaluates output cold
```

This mirrors the writer/reviewer pattern for code review — the reviewer's fresh context catches gaps the author's
context conceals.
