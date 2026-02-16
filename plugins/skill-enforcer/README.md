# skill-enforcer

Enforces consistent skill evaluation and reference reading throughout coding sessions.

## The Problem

**Skills get skipped.** Claude Code has access to skills — domain-specific instructions loaded
via the Skill tool. But when facing a task, Claude often jumps straight to implementation
without checking if relevant skills exist. The skills are available, but there's no trigger to
evaluate them.

**Skills are treated as atomic.** Once a skill is invoked, it's mentally checked off as "done."
But skills often contain multiple references — some for coding, some for testing, some for
review. When the development phase changes (implementation → testing), the relevant references
from already-loaded skills never get read.

**Phase transitions go unnoticed.** Moving from coding to testing is a significant context shift
that should trigger re-evaluation. Without enforcement, Claude continues with whatever context
it already has, missing both new skills that now apply and unread references from previously
loaded skills.

## The Solution

This plugin injects a Skill Enforcement Framework (SEF) that creates mandatory checkpoints at
key lifecycle events. The framework forces Claude to evaluate skills and references at each
checkpoint, treating skills as non-atomic: invocation is a starting point, not an endpoint.

**Checkpoint flow:**

```
Session Start    →  Load full SEF framework
User Prompt      →  USER-PROMPT: Evaluate and invoke matching skills
After Read       →  EVALUATION: Re-evaluate after context gathering
After Edit/Write →  PHASE-CHANGE: Detect phase shifts, load relevant refs
After Skill      →  SKILL-LOAD: Read phase-relevant refs, consider related skills
```

Each checkpoint injects an XML tag that triggers a structured evaluation. The evaluation must be
output in the reasoning stage (thinking block) using a prescribed format with stage-specific
fields. Silent acknowledgment = violation.

## Installation

```
/plugin marketplace add xobotyi/cc-foundry
/plugin install skill-enforcer
```

## How It Works

### Framework Injection (Session Start)

At session start (and after context compaction), the plugin injects the complete SEF definition.
This establishes:

- **Purpose** — why skills need enforcement (non-atomic, phase-aware)
- **Matching rules** — how to determine which skills apply to a task
- **Evaluation protocol** — how to process SEF tags (reasoning output required)
- **Stage definitions** — what each checkpoint phase requires
- **Examples** — correct behavior, phase transitions, and violations

The framework costs ~1050 tokens once per session. This upfront cost enables lightweight
checkpoint tags (~15 tokens each) instead of repeating instructions at every hook.

### Lifecycle Checkpoints

During the session, hooks inject XML tags at specific tool usage points:

**`<SEF phase="USER-PROMPT">`** — fires when user submits a message
- Evaluate: does this task match any skill by name or description?
- Action: invoke all matching skills before proceeding

**`<SEF phase="SKILL-LOAD">`** — fires after Skill tool invocation
- Evaluate: does this skill have references relevant to current phase?
- Action: read phase-relevant refs, consider invoking related skills

**`<SEF phase="EVALUATION">`** — fires after Read tool use
- Evaluate: did this read shift understanding enough to reconsider skills/refs?
- Action: invoke newly relevant skills or read newly relevant refs

**`<SEF phase="PHASE-CHANGE">`** — fires after Edit/Write tool use
- Evaluate: did the type of work change? (coding → testing, etc.)
- Action: enumerate loaded skills, identify unread refs relevant to new phase, read them

### Enforcement Mechanism

Each checkpoint tag triggers a mandatory evaluation that must follow this structure:

```xml
<think>
<sef-eval phase="[PHASE]">
  [stage-specific fields as child elements]
  <decision>[action to take]</decision>
</sef-eval>
</think>
```

The evaluation is internal reasoning (inside `<think>` block), never visible to the user.

**What makes it enforcement:**

1. **No escape hatches** — "I already know" or "continue without action" are violations
2. **Explicit enumeration** — PHASE-CHANGE requires listing all loaded skills and unread refs
3. **Concrete decisions** — must result in tool invocation (Skill/Read) or explicit "proceed"
4. **Reasoning requirement** — no `<sef-eval>` in `<think>` = no evaluation = violation

### Compaction Handling

The PreCompact hook injects instructions telling Claude to:
- Remove all SEF framework content and checkpoint tags
- Remove all `<sef-eval>` blocks from thinking outputs
- Preserve a flat list of all skill references read during the session
- Include instruction to re-read all references after framework re-injection

This prevents SEF scaffolding from consuming space in compacted context while preserving the
list of read references for session continuity.

## Architecture

```
hooks/
├── hooks.json     # Hook configuration (event → command mapping)
└── sef-hook.js    # Unified hook script with action parameter
```

The single `sef-hook.js` script handles all hook events via command-line argument:

```bash
node sef-hook.js session-start  # Outputs full framework (~1050 tokens)
node sef-hook.js pre-compact    # Outputs compaction instructions
node sef-hook.js prompt         # Outputs <SEF phase="USER-PROMPT">
node sef-hook.js read           # Outputs <SEF phase="EVALUATION">
node sef-hook.js write          # Outputs <SEF phase="PHASE-CHANGE">
node sef-hook.js skill          # Outputs <SEF phase="SKILL-LOAD">
```

The `hooks.json` registers lifecycle events:

| Event | Matcher | Action |
|-------|---------|--------|
| SessionStart | `startup\|resume\|clear\|compact` | `session-start` |
| PreCompact | (all) | `pre-compact` |
| UserPromptSubmit | (all) | `prompt` |
| PostToolUse | `Read` | `read` |
| PostToolUse | `Edit\|Write` | `write` |
| PostToolUse | `Skill` | `skill` |

## Token Efficiency

The plugin uses a "framework once + keywords repeatedly" pattern:

- **One-time cost**: ~1050 tokens for framework at session start
- **Per-checkpoint cost**: ~15 tokens per tag injection
- **Savings**: Compared to ~300 tokens if each hook repeated full stage instructions

The framework includes three detailed examples (positive case, phase-transition, violations)
which add to the token count but significantly improve compliance by demonstrating correct and
incorrect behavior.

## License

MIT
