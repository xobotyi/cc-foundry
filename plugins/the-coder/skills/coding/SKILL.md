---
name: coding
description: >-
  Coding workflow covering discovery, planning, implementation, and verification. Invoke whenever
  task involves any interaction with code — writing, modifying, debugging, refactoring, or
  understanding codebases. Runs discovery protocol before language-specific skills engage.
---

# Coding

**Discover before assuming. Verify before shipping.**

Every coding failure traces to one of three root causes:

1. Acting on assumptions instead of evidence
2. Skipping verification before declaring done
3. Burning context on noise instead of signal

This skill prevents all three.

## Core Loop

Every task follows this sequence. No exceptions.

```
Discover → Plan → Implement → Verify
```

- **Discover**: Read the code. Trace dependencies. Understand what exists.
- **Plan**: Define success criteria. Scope the change. Identify risks.
- **Implement**: Write minimal code. Work incrementally. Stay simple.
- **Verify**: Run tests. Validate behavior. Confirm requirements met.

The loop exists because each step prevents a category of failure. Skipping discovery causes wrong
assumptions. Skipping planning causes scope creep. Skipping verification ships broken code.

**The threshold**: if you can describe the diff in one sentence, skip planning. Otherwise, plan
first.

## The Assumption Interrupt

This pattern must become automatic in your reasoning:

<cognitive-interrupt>
WHENEVER you find yourself:
- Using a method/type/interface without having read its definition
- Using words like "probably", "likely", "should have", "typically"
- Recalling an API from memory instead of reading current source
- Planning changes to code you haven't read in this session
- Assuming a method signature, type structure, or interface shape

STOP. Ask yourself:
1. "Do I have evidence in current context that this exists?"
2. "Have I actually read this code, or am I assuming?"
3. If no evidence exists → VERIFY before proceeding.

Every unverified assumption is a potential compile failure, runtime bug, or behavioral regression.
</cognitive-interrupt>

<assumption-markers>
These words in your reasoning are RED FLAGS:
- "probably" → You don't know. Read it.
- "likely" → You're guessing. Check it.
- "should have" → Assumption. Verify it.
- "typically" → General knowledge, not this codebase. Read it.
- "I remember" → Memory is unreliable. Read it now.
- "usually" → This codebase may differ. Check it.
</assumption-markers>

## Discovery Protocol

Before planning or implementing, map the territory.

<discovery-protocol>

### 1. Map the Area
- Read files in the target directory
- Understand package/module structure
- Identify related files and established patterns

### 2. Trace Dependencies
- What does this code import/use?
- What imports/uses this code?
- Search for usages: grep for function/type names

### 3. Verify Contracts
- Read actual method signatures — don't assume
- Read interface and type definitions
- For third-party code: read vendored source OR fetch docs
- Verify: function exists, signature matches, types correct

### 4. Assess Impact
- Who calls what you're modifying?
- What tests cover this code?
- What might break?

</discovery-protocol>

Discovery is cheap. Debugging wrong assumptions is expensive.

## Planning Discipline

Before writing code, establish:

<planning-checklist>

1. **Success criteria** — What does "done" look like? Define measurable outcomes, not vague goals.

   Bad: "improve the API"
   Good: "add pagination to /api/users, 100 items/page, response under 200ms"

2. **Scope** — What files change? What stays untouched? Explicitly bound the change. Don't
   "helpfully improve" adjacent code.

3. **Risks** — What could break? If modifying shared code, trace all callers first.

4. **Verification strategy** — How will you prove it works? Tests > manual check > "it looks
   right". Define this BEFORE writing any implementation code.

</planning-checklist>

## Implementation Discipline

### Work Incrementally

Don't one-shot complex features.

<incremental-rules>
- One logical change at a time
- Verify each change works before moving to the next
- If a change touches 5+ files, break it into smaller steps
- Leave the codebase in a clean, working state at every step
- For multi-step tasks: track completed steps and remaining work
</incremental-rules>

### Write Simple Code

Agents overcomplicate by default. Actively resist this.

<simplicity-rules>
- Prefer functions over classes when either works
- Avoid inheritance unless the problem demands it
- Prefer explicit over implicit — no magic
- Keep permission checks and validation visible at the call site, not hidden in middleware the
  next reader won't find
- Use descriptive names — longer is better than ambiguous
- Do the simplest thing that works, then optimize if measured performance requires it
</simplicity-rules>

### Follow Existing Patterns

Before inventing a new pattern, search the codebase for existing ones. Consistency beats novelty.

<pattern-rules>
- Search for similar features/components as reference
- Match the existing error handling strategy
- Use the same testing patterns found in adjacent tests
- Follow the project's naming conventions
- Read CLAUDE.md and lint config for project-specific rules
</pattern-rules>

## Verification Discipline

Verification is the single highest-leverage activity. Code that "looks right" but hasn't been
tested is unverified code.

<verification-protocol>

### Before Declaring Done

1. **Run the tests** — If tests exist, run them. If they don't exist for the code you changed,
   write them.

2. **Check for regressions** — If you modified existing behavior, run the full relevant test
   suite, not just new tests.

3. **Validate against success criteria** — Revisit the criteria defined during planning. Does the
   implementation actually meet them? Not "probably meets them" — actually meets them.

4. **Review your own diff** — Read it as if reviewing someone else's code. Look for:
   - Leftover debug code or TODO comments
   - Missing error handling
   - Hardcoded values that should be configurable
   - Edge cases not covered
   - Dead code from previous attempts

5. **Type-check and lint** — If the project has type checking or linting, run it. Don't ship code
   with known warnings.

</verification-protocol>

### Self-Verification Patterns

<self-verification>
- Write a failing test first, then implement until it passes
- Use subagents for fresh-context review — they catch mistakes you'll miss in the same context
  where you wrote the code
- For UI changes: take a screenshot, compare to requirements
- For API changes: test with actual requests
- For refactors: verify identical behavior before and after
</self-verification>

## Context Management

Context is a finite resource with diminishing returns. Every token consumed reduces reasoning
quality on the next problem.

<context-rules>

### Protect Your Context
- Use subagents for investigation — they explore in separate context and return only summaries
- Don't read entire large files when you need a specific function — use grep/glob to find what
  you need
- After two failed corrections on the same issue, start fresh rather than accumulating failed
  approaches in context

### Be Token-Efficient
- Search narrowly before searching broadly
- Read what you need, when you need it
- Don't pre-load files "just in case"
- Prefer just-in-time context retrieval over upfront loading

### Track Progress
- For multi-step work: document completed steps and decisions
- Leave the codebase in a clean state at every checkpoint
- Write clear commit messages that explain WHY, not just WHAT

</context-rules>

## Anti-Patterns

| Pattern                      | Why It Fails                    | Fix                                |
|------------------------------|---------------------------------|------------------------------------|
| Coding before reading        | Builds on wrong assumptions     | Discovery protocol first           |
| Assuming signatures          | Compile/runtime errors          | Read the definition                |
| "Looks right" verification   | Misses regressions              | Run tests, validate criteria       |
| One-shotting complex work    | Broken intermediate state       | Work incrementally                 |
| Overcomplicating             | Abstraction bloat, dead code    | Simplest thing that works          |
| Touching unrelated code      | Scope creep, surprise breaks    | Stay within defined scope          |
| Ignoring existing patterns   | Inconsistent codebase           | Search for examples first          |
| Filling context exploring    | Degrades reasoning quality      | Use subagents for research         |
| No tests before "done"       | Shipping unverified code        | Always test before complete        |
| Not pushing back             | Building wrong thing            | Surface concerns, question premises|

## Integration

This skill runs BEFORE language-specific skills.

Workflow:
1. **Coding skill** — Discovery, planning, discipline
2. **Language skill** (go, typescript, etc.) — Implementation following language-specific
   conventions
3. **Coding skill** — Verification, anti-pattern check

IMPORTANT: Return to the verification protocol of this skill before declaring any task complete.
