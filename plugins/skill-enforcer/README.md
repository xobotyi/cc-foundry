# skill-enforcer

A Claude Code plugin that enforces consistent skill evaluation
throughout coding sessions.

## Problem

Claude Code has access to skills (domain-specific instructions loaded
via the Skill tool), but without enforcement:

- Skills get skipped when Claude jumps straight to implementation
- Phase transitions (coding → testing) don't trigger skill re-evaluation
- Batch invocation opportunities are missed

## Solution

This plugin injects a Skill Enforcement Framework (SEF) via hooks that
creates mandatory checkpoints at key lifecycle points:

```
Session Start    →  Load full SEF framework
User Prompt      →  SEF_PROMPT: Evaluate before tool use
After Read       →  SEF_EVAL: Evaluate after context gathering
After Edit/Write →  SEF_PHASE: Check for phase transitions
After Skill      →  SEF_REFS: Consider batch invocations
```

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
the complete SEF definition. This establishes the tag vocabulary and
evaluation protocols.

### 2. Tag-Based Checkpoints

During the session, hooks inject minimal XML tags at specific points:

- `<SEF_PROMPT/>` - Before processing user prompts
- `<SEF_EVAL/>` - After Read/Grep/Glob tool use
- `<SEF_PHASE/>` - After Edit/Write tool use
- `<SEF_REFS/>` - After Skill tool use

Each tag triggers a specific evaluation workflow defined in the
framework.

### 3. Enforcement

The framework includes constraints that make ignoring tags a violation.
Claude must acknowledge and act on each tag before continuing.

## Architecture

```
hooks/
├── hooks.json     # Hook configuration (event → command mapping)
└── sef-hook.js    # Unified hook script with action parameter
```

The single `sef-hook.js` script handles all hook events via command-line
argument:

```bash
node sef-hook.js session-start  # Outputs full framework
node sef-hook.js prompt         # Outputs SEF_PROMPT tag
node sef-hook.js read           # Outputs SEF_EVAL tag
node sef-hook.js write          # Outputs SEF_PHASE tag
node sef-hook.js skill          # Outputs SEF_REFS tag
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

- **One-time cost**: ~500 tokens for framework at session start
- **Per-hook cost**: ~20 tokens per tag reference
- **Savings**: Compared to ~200 tokens if each hook repeated full
  instructions

## License

MIT
