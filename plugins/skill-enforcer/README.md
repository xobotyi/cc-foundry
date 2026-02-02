# skill-enforcer

A Claude Code plugin that enforces consistent skill evaluation
throughout coding sessions.

## The Problem

Claude Code has access to skills — domain-specific instructions loaded
via the Skill tool. But without enforcement, several issues arise:

**Skills get skipped.** When Claude sees a task, it often jumps straight
to implementation without checking if relevant skills exist. The skills
are available, but Claude doesn't think to invoke them.

**Skills are treated as atomic.** Once invoked, a skill is considered
"done." But skills often contain multiple references — some for coding,
some for testing, some for review. When development phases change, the
relevant references from already-loaded skills never get read.

**Phase transitions go unnoticed.** Moving from coding to testing is a
significant shift that should trigger re-evaluation. Without enforcement,
Claude continues with whatever context it has, missing both new skills
that now apply and unread references from loaded skills.

## The Solution

This plugin injects a Skill Enforcement Framework (SEF) via hooks. The
framework creates mandatory checkpoints at key lifecycle points, forcing
Claude to evaluate skills and references at each stage.

```
Session Start    →  Load full SEF framework
User Prompt      →  USER-PROMPT: Evaluate and invoke matching skills
After Read       →  EVALUATION: Re-evaluate after context gathering
After Edit/Write →  PHASE-CHANGE: Check for phase transitions, load refs
After Skill      →  SKILL-LOAD: Consider batch invocations, read refs
```

The framework treats skills as non-atomic: invocation is a starting point,
not an endpoint. A skill isn't exhausted until all phase-relevant
references have been read.

## Installation

Copy this plugin to your Claude Code plugins directory:

```bash
cp -r plugins/skill-enforcer ~/.claude/plugins/
```

Or symlink for development:

```bash
ln -s $(pwd)/plugins/skill-enforcer ~/.claude/plugins/skill-enforcer
```

## How It Works

### 1. Framework Injection (Session Start)

At session start (and after context compaction), the plugin injects
the complete SEF definition. This establishes:

- **Purpose**: Why skills need enforcement (non-atomic, phase-aware)
- **Matching rules**: How to determine which skills apply
- **Evaluation protocol**: How to process SEF tags (reasoning output required)
- **Stage definitions**: What each phase requires
- **Examples**: Correct behavior and violations

### 2. Tag-Based Checkpoints

During the session, hooks inject XML tags at specific points:

- `<SEF phase="USER-PROMPT">` — When user submits a message
- `<SEF phase="EVALUATION">` — After Read tool use
- `<SEF phase="PHASE-CHANGE">` — After Edit/Write tool use
- `<SEF phase="SKILL-LOAD">` — After Skill tool use

Each tag triggers a structured evaluation that must be output in the
reasoning stage (thinking block). The evaluation follows a prescribed
thought format with stage-specific fields.

### 3. Enforcement

The framework makes ignoring tags a violation. Claude must:

1. Output evaluation in reasoning stage (silent acknowledgment = violation)
2. Enumerate loaded skills and unread refs (for PHASE-CHANGE)
3. Reach an explicit decision (no escape hatches like "continue")
4. Take the indicated action before proceeding

## Architecture

```
hooks/
├── hooks.json     # Hook configuration (event → command mapping)
└── sef-hook.js    # Unified hook script with action parameter
```

The single `sef-hook.js` script handles all hook events via command-line
argument:

```bash
node sef-hook.js session-start  # Outputs full framework (~1050 tokens)
node sef-hook.js prompt         # Outputs <SEF phase="USER-PROMPT">
node sef-hook.js read           # Outputs <SEF phase="EVALUATION">
node sef-hook.js write          # Outputs <SEF phase="PHASE-CHANGE">
node sef-hook.js skill          # Outputs <SEF phase="SKILL-LOAD">
```

## Configuration

The `hooks.json` registers hooks for:

| Event | Matcher | Action |
|-------|---------|--------|
| SessionStart | `startup\|compact` | `session-start` |
| UserPromptSubmit | (all) | `prompt` |
| PostToolUse | `Read` | `read` |
| PostToolUse | `Edit\|Write` | `write` |
| PostToolUse | `Skill` | `skill` |

## Token Efficiency

The plugin uses a "framework + keywords" pattern:

- **One-time cost**: ~1050 tokens for framework at session start
- **Per-hook cost**: ~15 tokens per tag injection
- **Savings**: Compared to ~300 tokens if each hook repeated full
  stage instructions

The framework includes three examples (positive, phase-transition,
violation) which add tokens but significantly improve compliance.

## License

MIT
