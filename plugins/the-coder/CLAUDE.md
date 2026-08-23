# the-coder Plugin

Language-agnostic software engineering discipline for Claude Code.

## Skills

- **`coding`** — discovery-first workflow: verify APIs before coding, debug by hypothesis, test before declaring done

## Output Styles

- **`software-engineer`** — implementation-focused persona with engineering judgment, incremental commits, and
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

- Atomic is defined as a code boundary, never a task boundary: the smallest change that leaves the tree building and
  passing. The split test decides it — if the change cuts into two pieces that each build and pass, it is not one
  change. "The task is one logical change" is the rationalization this exists to block
- Second, independent test: a change does one kind of work, because its audience is a reviewer holding one question. New
  code ships apart from its wiring; a prerequisite refactor lands first. Deliverability alone misses these, since both
  halves build and pass together. At equal correctness, the finer split wins
- The `coding` skill owns the per-commit checkpoint: ~400-500 lines of production code triggers a commit, tests excluded
  from the budget, atomicity outranking the budget only once the split test has failed
- Two granularities, stated once each — phase (~100-200 lines, one verification gate) lives in the `software-engineer`
  style's Planning section; commit size lives in the skill. A phase lands as one to three commits
- `git-commit:commit` runs during the work, not at the end; it owns unit boundaries and messages, never the size rule
- Decomposition happens at planning time and produces an ordered change list, each entry one commit and one kind of
  work. The two atomicity tests are planning tools; at commit time they only confirm the list held. Splitting a finished
  diff is the failure mode the change list exists to prevent
- Execution is bound to the list: no code for the next entry until the current one is committed
- Entry sources: the task statement (implement vs. integrate) and discovery (a prerequisite refactor goes first)
- A dummy integrated layer comes first, then one capability per commit in dependency order (storage, then its caller,
  then the surface). Horizontal means one layer across every feature — building one feature's storage before its handler
  is dependency order, not a horizontal plan

**Comment and documentation policy:**

- The `coding` skill owns comment policy for the marketplace — `the-writer` disclaims it, and the language skills
  reference its "no comments" default without defining one
- The reader is the test — a comment or doc line that hands them nothing the code already gives is waste, never
  compliance with a "document this" rule
- Repair is proactive and unprompted, scoped to the files edited and symbols read for the change — never a repo sweep.
  The style's "don't refactor unrelated code" rule carries the matching exception
- Comments carry the non-obvious WHY only; docs state the current contract only, at whatever length the caller needs
- Neither carries history, changelogs, ticket references, or the change that produced them — git and the tracker hold
  those
- Language skills keep their own doc-comment placement rules (which symbols need docs); this policy governs the content

**LSP routing:**

- Owned by the language plugins that ship the servers (golang, javascript, python, rust, php) — each language skill
  carries the routing with its own reasons. Neither this plugin's style nor its `coding` skill restates it: `the-coder`
  ships no LSP server, so an always-on copy would fire in sessions that have no server at all
