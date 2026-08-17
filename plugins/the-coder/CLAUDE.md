# the-coder Plugin

Language-agnostic software engineering discipline for Claude Code.

## Skills

- **`coding`** — discovery-first workflow: verify APIs before coding, debug by hypothesis, test before declaring done

## Output Styles

- **`software-engineer`** — implementation-focused persona with engineering judgment, LSP-first navigation, and
  controlled-language discipline (ASD-STE100 plus ubiquitous language)

## Plugin Scope

This plugin covers universal coding practices that apply across all languages:

- Discovery → Plan → Implement → Verify workflow
- Assumption interrupts (never assume API signatures, always verify)
- Incremental implementation discipline, including the per-commit size checkpoint
- Comment and documentation policy (reader-driven: WHY-only comments, contract-only docs, history in neither)
- Debugging discipline (build a red loop → minimize → hypothesize → bisect → explain)
- Verification before completion; failing checks get fixed, never silenced
- Context management and token efficiency

Language-specific patterns, idioms, and toolchains belong in dedicated discipline plugins (golang, javascript, etc.).
The `coding` skill runs before language-specific skills as a prerequisite.

## Conventions

**Skill activation:**

- The `software-engineer` output style enforces `coding` skill invocation before implementation
- Language skills (go, typescript, etc.) run after `coding` in a skill queue
- Example queue: `coding` → `golang` → verification

**Change size:**

- The `coding` skill owns the per-commit checkpoint: ~400-500 lines of production code triggers a commit, tests excluded
  from the budget, atomicity outranking the budget
- Two granularities, stated once each — phase (~100-200 lines, one verification gate) lives in the `software-engineer`
  style's Planning section; commit size lives in the skill. A phase lands as one to three commits
- `git-commit:commit` runs during the work, not at the end; it owns unit boundaries and messages, never the size rule

**Comment and documentation policy:**

- The `coding` skill owns comment policy for the marketplace — `the-writer` disclaims it, and the language skills
  reference its "no comments" default without defining one
- The reader is the test — a comment or doc line that hands them nothing the code already gives is waste, never
  compliance with a "document this" rule
- Comments carry the non-obvious WHY only; docs state the current contract only, at whatever length the caller needs
- Neither carries history, changelogs, ticket references, or the change that produced them — git and the tracker hold
  those
- Language skills keep their own doc-comment placement rules (which symbols need docs); this policy governs the content

**LSP-first:**

- The `software-engineer` style prioritizes LSP tools (goToDefinition, findReferences) over grep/glob for symbol queries
- Fall back to grep/glob only when LSP is unavailable or fails
