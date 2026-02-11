# Skill Enforcer Plugin

This plugin ensures Claude consistently invokes skills and reads their
references throughout a coding session. Without enforcement, Claude tends
to skip skills when jumping straight to implementation, and forgets to
re-read references when development phases change.

## The Core Problem

Skills aren't atomic. When you invoke a skill, you get its main content,
but skills often contain multiple references — some relevant to coding,
others to testing, others to review. The default behavior treats skill
invocation as "done," missing references that become relevant later.

For example: you invoke a coding skill while writing implementation.
Later, you transition to writing tests. The same skill has testing
references you never read, because the skill was already "invoked."

## How SEF Solves This

The Skill Enforcement Framework (SEF) injects at session start and
establishes checkpoints via XML tags at key lifecycle events:

| Event | Tag | What Happens |
|-------|-----|--------------|
| Session start | Full framework | Establishes vocabulary and protocol |
| User message | `<SEF phase="USER-PROMPT">` | Evaluate which skills match the task |
| After Read | `<SEF phase="EVALUATION">` | Re-evaluate after learning new context |
| After Edit/Write | `<SEF phase="PHASE-CHANGE">` | Check if phase shifted, load new refs |
| After Skill | `<SEF phase="SKILL-LOAD">` | Consider related skills, read initial refs |

## Key Concepts

**Skills are not atomic.** A skill isn't exhausted until all phase-relevant
references have been read. Invocation is a starting point, not an endpoint.

**Phase shifts require re-evaluation.** When transitioning from coding to
testing (or any phase change), both new skills AND references from
already-loaded skills must be considered.

**Evaluation requires reasoning output.** Seeing a tag and silently
acknowledging it is a violation. The evaluation must be output in the
reasoning stage (thinking block) following the prescribed thought format.

## Thought Format

When a tag is seen, output in reasoning stage:

```
SEF [PHASE]
[evaluation fields per stage]
→ [decision]
```

Each stage has specific fields. For example, PHASE-CHANGE requires
enumerating loaded skills and listing unread refs per skill.

## Compliance

- No skill invocation when matched = violation
- No reference read when context shifts = incomplete
- No reasoning output = no evaluation = violation

<claude-mem-context>
# Recent Activity

### Feb 1, 2026

| ID | Time | T | Title | Read |
|----|------|---|-------|------|
| #6530 | 11:46 PM | ✅ | SEF thought format wrapped in code block for clarity | ~284 |
| #6517 | 11:40 PM | 🔵 | SEF plugin documentation with compliance verification workflow | ~456 |
</claude-mem-context>
