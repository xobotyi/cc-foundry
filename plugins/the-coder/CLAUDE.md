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
- Comment and documentation policy (zero comments by default, five permitted kinds, rename-first, contract-only docs)
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
  reference its "no comments" default. That default is now defined here rather than assumed
- **The default is zero comments, enforced as a closed set, not a judgment call.** Five kinds may exist: doc comments on
  public symbols, an escape hatch's justification, `shortcut:`, `constraint:`, `why?:`. Nothing else. The previous
  "comment the non-obvious WHY" rule was replaced because it licensed the output it was meant to limit — a model asked
  to find a non-obvious why always finds one
- **The policy governs commentary, not comment-syntax a tool parses.** Build tags, `// Output:`, linter and type-checker
  directives, codegen pragmas are program text and out of scope — deleting one changes what builds or gets checked.
  Defined by that property, never by a roster; kinds name examples and say they are examples, because an unmarked list
  inside a closed set reads as exhaustive
- **The closed set overrides the default system prompt's non-obvious-WHY permission**, which classic-prompt models still
  receive. ADR 0007 assumed the two agreed; they no longer do
- Four of the five are markers with fixed grammar (one line, present tense, greppable), so the permitted set cannot
  expand into prose. `constraint:` exists because routing an external-world fact to an architecture doc loses it: the
  next person to touch the code never opens that doc
- **Rename before commenting.** A comment whose payload fits in an identifier is a naming defect. Free for private
  symbols, same-change caller updates for public ones, forbidden for symbols published in generated docs
- **Provenance gates every WHY.** A reason you hold (your decision, the user, the ticket) is stated plainly; a reason
  inferred by reading is marked `why?:` or omitted. `why?: unknown` is a finished answer — a wrong reason stated as fact
  survives review and is never re-checked
- **Routing ladder replaces the delete-only rule**: name → test → doc comment → rule doc → architecture doc → marker →
  drown. Drown is the default verdict and is silent; rescuing nothing is a good run. The ladder exists to make deletion
  cheap, because an agent with nowhere to put a fact hoards it in a comment
- Repair is proactive and unprompted, scoped to the files edited and symbols read for the change — never a repo sweep.
  The style's "don't refactor unrelated code" rule carries the matching exception
- **Doc comments are written for a reader, and that reader is the only test** — a caller holding the signature and
  nothing else. A convention can demand the slot exists; it can never supply a word of the content. One line is finished
  work when the signature already answered the question, and a doc needing a paragraph is a signature finding
- Docs state the current contract only. Neither comments nor docs carry history, changelogs, ticket references, or the
  change that produced them — git and the tracker hold those
- **The codebase-conflict rule is inverted for comments.** Elsewhere the codebase wins; here a comment-heavy convention
  neither licenses writing new comments nor authorizes stripping existing ones
- Language skills keep their own doc-comment placement rules (which symbols need docs); this policy governs the content

**LSP routing:**

- Owned by the language plugins that ship the servers (golang, javascript, python, rust, php) — each language skill
  carries the routing with its own reasons. Neither this plugin's style nor its `coding` skill restates it: `the-coder`
  ships no LSP server, so an always-on copy would fire in sessions that have no server at all
