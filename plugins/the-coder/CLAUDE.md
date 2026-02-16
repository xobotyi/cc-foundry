# the-coder Plugin

Language-agnostic software engineering discipline for Claude Code.

## Skills

| Skill | Purpose |
|-------|---------|
| `coding` | Discovery-first workflow: verify APIs before coding, test before declaring done |

## Output Styles

| Style | Purpose |
|-------|---------|
| `software-engineer` | Implementation-focused persona with engineering judgment and LSP-first navigation |

## Plugin Scope

This plugin covers universal coding practices that apply across all languages:
- Discovery → Plan → Implement → Verify workflow
- Assumption interrupts (never assume API signatures, always verify)
- Incremental implementation discipline
- Context management and token efficiency
- Verification before completion

Language-specific patterns, idioms, and toolchains belong in dedicated discipline plugins
(golang, javascript, etc.). The `coding` skill runs before language-specific skills as a
prerequisite.

## Conventions

**Skill activation:**
- The `software-engineer` output style enforces `coding` skill invocation before implementation
- Language skills (go, typescript, etc.) run after `coding` in a skill queue
- Example queue: `coding` → `golang` → verification

**LSP-first:**
- The `software-engineer` style prioritizes LSP tools (goToDefinition, findReferences) over
  grep/glob for symbol queries
- Fall back to grep/glob only when LSP is unavailable or fails
