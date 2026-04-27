# skill-enforcer

Enforces consistent skill evaluation and reference reading throughout coding sessions.

## The Problem

**Skills get skipped.** Claude Code has access to skills — domain-specific instructions loaded via the Skill tool. But
when facing a task, Claude often jumps straight to implementation without checking if relevant skills exist. The skills
are available, but there's no trigger to evaluate them.

**Skills are treated as atomic.** Once a skill is invoked, it's mentally checked off as "done." But skills often contain
multiple references — some for coding, some for testing, some for review. When the development phase changes
(implementation → testing), the relevant references from already-loaded skills never get read.

**Phase transitions go unnoticed.** Moving from coding to testing is a significant context shift that should trigger
re-evaluation. Without enforcement, Claude continues with whatever context it already has, missing both new skills that
now apply and unread references from previously loaded skills.

## The Solution

This plugin injects a Skill Enforcement Framework (SEF) that creates mandatory checkpoints at key lifecycle events. The
framework forces Claude to evaluate skills and references at each checkpoint, treating skills as non-atomic: invocation
is a starting point, not an endpoint.

**Checkpoint flow:**

```
Session Start    →  Load full SEF framework
User Prompt      →  USER-PROMPT: Evaluate and invoke matching skills
After Read       →  EVALUATION: Re-evaluate after context gathering
After Edit/Write →  PHASE-CHANGE: Detect phase shifts, load relevant refs
After Skill      →  SKILL-LOAD: Read phase-relevant refs, consider related skills
```

Each checkpoint injects a self-contained `<SEF phase="...">` payload that carries the format invariant, the required
`<sef-eval>` field skeleton, and the stage-specific decision rule. The evaluation must be emitted inside the model's
native thinking stream — never in visible response. Silent acknowledgment = violation.

## Installation

```
/plugin marketplace add xobotyi/cc-foundry
/plugin install skill-enforcer
```

## How It Works

### Framework Injection (Session Start)

At session start (and after context compaction), the plugin injects the complete SEF definition. This establishes:

- **Purpose** — why skills need enforcement (non-atomic, phase-aware)
- **Matching rules** — how to determine which skills apply to a task
- **Evaluation protocol** — how to process SEF tags (reasoning output required)
- **Stage definitions** — what each checkpoint phase requires
- **Examples** — correct behavior, phase transitions, and violations

The framework costs ~2300 tokens once per session. This establishes the shared vocabulary; the actual operational
contract is restated by every per-stage trigger.

### Why triggers are self-contained

The original design used thin pointer tags (~15 tokens) that said "invoke stage procedure" and relied on the
session-start framework still being in attention. That assumption holds in 200k-token contexts. It breaks at 1M-token
scale: by the time the agent has read 50+ files and made 20+ edits, the framework definition sits deep in the U-shaped
attention curve's low-attention middle, and the pointer trigger becomes a cargo-cult ritual the model performs without
remembering what it actually requires.

Self-contained triggers fix this by carrying the full operational contract — format invariant, eval skeleton with
required fields, decision rule — at every firing. The trigger becomes the local source of truth; reaching back into the
session-start definition becomes optional rather than load-bearing.

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
<thinking>
<sef-eval phase="[PHASE]">
  [stage-specific fields as child elements]
  <decision>[action to take]</decision>
</sef-eval>
</thinking>
```

The evaluation is internal reasoning (inside the `<thinking>` stream), never visible to the user.

**What makes it enforcement:**

1. **No escape hatches** — "I already know" or "continue without action" are violations
2. **Explicit enumeration** — PHASE-CHANGE requires listing all loaded skills and unread refs
3. **Concrete decisions** — must result in tool invocation (Skill/Read) or explicit "proceed"
4. **Reasoning requirement** — no `<sef-eval>` in `<thinking>` = no evaluation = violation

### Compaction Handling

The PreCompact hook injects instructions telling Claude to:

- Remove all SEF framework content and checkpoint tags
- Remove all `<sef-eval>` blocks from thinking outputs
- Preserve a flat list of all skill references read during the session
- Include instruction to re-read all references after framework re-injection

This prevents SEF scaffolding from consuming space in compacted context while preserving the list of read references for
session continuity.

## Architecture

```
hooks/
├── hooks.json     # Hook configuration (event → command mapping)
└── sef-hook.js    # Unified hook script with action parameter
```

The single `sef-hook.js` script handles all hook events via command-line argument:

```bash
node sef-hook.js session-start  # Outputs full framework (~2300 tokens)
node sef-hook.js pre-compact    # Outputs compaction instructions
node sef-hook.js prompt         # Outputs USER-PROMPT trigger (~100 tokens)
node sef-hook.js read           # Outputs EVALUATION trigger (~150 tokens)
node sef-hook.js write          # Outputs PHASE-CHANGE trigger (~170 tokens)
node sef-hook.js skill          # Outputs SKILL-LOAD trigger (~135 tokens)
```

All payloads are rendered from a single `STAGES` object in `sef-hook.js`. The session-start framework block and the
per-trigger payloads share field definitions and decision rules by construction — adding a stage or renaming a field
updates both at once, with no risk of drift.

The `hooks.json` registers lifecycle events:

| Event            | Matcher                           | Action          |
| ---------------- | --------------------------------- | --------------- |
| SessionStart     | `startup\|resume\|clear\|compact` | `session-start` |
| PreCompact       | (all)                             | `pre-compact`   |
| UserPromptSubmit | (all)                             | `prompt`        |
| PostToolUse      | `Read`                            | `read`          |
| PostToolUse      | `Edit\|Write`                     | `write`         |
| PostToolUse      | `Skill`                           | `skill`         |

## Token Efficiency

The plugin uses a "framework once + self-contained triggers repeatedly" pattern:

- **One-time cost**: ~2300 tokens for framework at session start (purpose, matching rules, stage definitions, examples)
- **Per-trigger cost**: ~100–170 tokens per checkpoint, depending on stage. Each trigger is a self-contained mini-spec
  carrying the format invariant, the eval skeleton with required fields, and the decision rule.

In a session with 100 tool calls, per-trigger overhead lands around 12k tokens — about 1% of a 1M-token context. The
extra cost vs. the previous thin-pointer design (~15 tokens per trigger) is the price of correctness in long sessions:
self-contained triggers stay correctable when the session-start framework has drifted out of attention. Triggers are
byte-identical across firings, so KV-cache reuses them after first occurrence — the marginal latency/billing cost is far
below the raw token count.

The framework includes five examples (positive case, phase-transition, three violations) which add to the session-start
token count but significantly improve compliance by demonstrating correct and incorrect behavior.

## License

MIT
