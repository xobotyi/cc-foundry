# the-coder Plugin

Language-agnostic software engineering discipline for Claude Code.

## Skills

- **`coding`** — discovery-first workflow: verify APIs before coding, split the work before writing it, prove completion
  with evidence. Three references carry the conditional depth:
  - `references/comments.md` — the closed set, routing ladder, rename limits, provenance, doc contract, repair. Loads
    when writing, repairing, or reviewing a comment or doc comment
  - `references/debugging.md` — the ordered protocol, multi-component localization, the failed-fix counter. Loads on a
    test failure, a reported bug, or surprising behavior, before a fix is proposed
  - `references/patterns.md` — error handling, dependency isolation, refactor targets. Loads when writing error paths,
    introducing a seam, or improving existing code

## Output Styles

- **`software-engineer`** — least-new-code discipline, autonomy calibration, turn discipline, the skill queue that runs
  `coding` first, phase-level planning, and controlled-language discipline (ASD-STE100 plus ubiquitous language)

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

**Output style configuration:**

- `keep-coding-instructions: false`. The plugin targets lean-prompt models, where the flag is inert and `# Doing tasks`
  never reaches the prompt — so the value states intent rather than changing behavior: this plugin's engineering rules
  are the ones it wrote, not the ones it inherited
- Nothing is backfilled to replace the gated section. Its rules were never in the target model's prompt, so restoring
  them would add instructions to compensate for a removal that did not happen. On a classic-prompt model this leaves the
  OWASP bullet, the can't-happen-validation rule, the backwards-compat-hack rule, and the UI dev-server check unstated —
  accepted, because that model is not the target
- The style carries no copy of a rule the target model already states — `file:line` references and completion honesty
  were cut on exactly that ground. This governs the default prompt only; overlap with this plugin's own `coding` skill
  is deliberate, because a style and a skill load independently
- **The style is self-sufficient for code work.** Selecting it does not load `coding`, so every rule the style needs
  holds whether or not the skill fires. Its `Code` section states the operative kernel — comment density, no reviewer
  narration, root-cause fixes, observed claims — and the skill supplies the depth when it loads
- **No precedence claims.** The style body is appended to the system prompt, so a passage saying "these rules outrank
  the default" is one part of a document disowning another part of itself, with no stated boundary for how far the
  disowning reaches. State the rule you want as a direct instruction and never name what it displaces. The
  comment-density rule is the worked case: the style says "do not match its comment density" and says nothing about
  where the opposite instruction comes from
- **`Conflicting Instructions` orders external sources, never the prompt.** Every entry names an actor — the user,
  CLAUDE.md, a skill, this style — so the section states operator intent the model cannot infer, rather than disowning
  the document it sits in. The style ranking itself fourth is a self-demotion, which carries no loophole
- **The resolution is disclosed, not silent.** Naming the followed instruction and the discarded one is the operative
  half: a conflict resolved silently is a decision the user never saw. The threshold is "would produce different work",
  so ordinary tension between rules does not trigger a disclosure line
- A contradiction between two project instructions is reported as a defect in that project. Arbitrating the same pair
  every session is the cost of not saying so once
- **One concern, one section.** Everything governing what the agent emits lives under `## Output` — voice, writing
  discipline, response shape, the language contract. They were four top-level sections separated by work rules, which
  made the register readable only by reassembling it from four places. Work rules stay at top level because they are
  separate concerns, not facets of one; the asymmetry is deliberate
- Section order follows the attention curve: identity and autonomy at the top, `## Output` in the back half, and
  `## Conflicting Instructions` last. The episodic rules — skill queue, planning, code — take the middle, because a rule
  that fires occasionally survives the trough better than one that must hold on every response
- **No stance section, and no concept-label bullets.** An `Epistemic Stance` section existed and was dissolved: its
  bullets led with names ("Peer engineer, not code monkey", "Asymmetric knowledge") that state a value rather than ask
  for a behavior, and each carried its real rule in the body underneath. The rules moved to where they fire — read
  before opining and probe an external contract went to `## Code`, the disagreement obligation merged into the
  Counter-argument bullet that already carried its format, and say-what-you-don't-know went to `### Writing`. The
  asymmetric-knowledge bullet was cut outright as a restatement of the default prompt's ambiguity rule
- **The opening states behavior, never an aphorism.** "Code is a liability" named a value the model derives nothing
  from. The operational form replaced it: solve with the least new code, look first at this codebase, its dependencies,
  the standard library, and existing platform features, and count a task closed by deletion as better closed. The guard
  against the obvious misreading ships in the same paragraph — minimum code is not minimum work

**Skill size and splitting:**

- **The `coding` SKILL.md body fits inside the 5,000-token compaction window** — 4,789 tokens, measured. Past that,
  Claude Code re-attaches only the first 5,000 tokens of a skill, so the tail is dropped exactly when the session is
  long enough to need it. Before the split the body was 9,201 tokens and the cutoff fell at line 375, taking the entire
  debugging and verification sections with it — two of the four things the description advertises
- Measure with `c=$(wc -c < FILE); echo $((c/4))`, and locate the cutoff with
  `awk '{n+=length($0)+1; if(n>20000){print NR; exit}}' FILE`. An empty result means the body fits
- **This sharpens ADR 0002 rather than overturning it.** 0002's invariant is behavioral self-sufficiency, not permission
  to be long: a rule past the cutoff is self-sufficient only until the first compaction, after which the agent runs a
  skill whose verification section no longer exists. Self-sufficiency has to hold inside the durable window
- Each reference states its load condition at the point the condition arises, never as "see references/ for details" —
  an unconditioned pointer is a guess about whether the file is ever read
- **Moving the comment depth out became safe only once the style carried the kernel.** The `software-engineer` style
  states comment density, no reviewer narration, and rationale routing in the system prompt, which outlives any skill
  body. The reference carries the closed set and the repair procedure on top of that floor

**Prior art folded into `coding` (2026-08-29):**

- From `obra/superpowers` `systematic-debugging`: the failed-fix counter (three failures means the architecture is the
  question, not the fix) and the multi-component localization step (instrument every boundary in one pass before forming
  a hypothesis). Both were absent — the protocol went from "build the loop" straight to "rank hypotheses"
- From `obra/superpowers` `verification-before-completion`: the claim/proof/not-proof table, the red-green check on a
  regression test (revert the fix, confirm it goes red), and verifying a subagent's work against the diff rather than
  its report
- From `multica-ai/andrej-karpathy-skills`: "every changed line traces to the request" as a test run over the finished
  diff, and the orphan boundary — clean up what your change made unused, leave pre-existing dead code alone
- Their craft was not taken, per ADR 0006: emphasis stacking (`MUST`, `ALWAYS`, all-caps), worked shell examples, and
  quick-reference tables restating the body

**Autonomy:**

- **Autonomy is defined by what it removes.** The section opens by naming both halves — it removes the permission
  request, never the investigation — because "default to acting" alone is executed as haste: the model drops the reading
  along with the confirmation round-trip. The look-then-act order is stated as fixed, and the section says outright that
  the order is not the part being autonomous
- The readiness test is "state what the edit changes and why the evidence supports it"; failing it means read more. It
  is marked silent in the same clause, so it cannot turn into preamble and collide with the no-narration rule
- The style leads with permission, not with a gate: reversible in-scope work proceeds once understood, and the
  exceptions come after. Prior art surveyed for this (`opus-fable-playbook`, `fable-method`) states the gate first,
  which reads as stop-by-default and costs autonomous operation
- The authorization rule is narrowed to irreversible and outward-facing actions, and its kernel is what does **not**
  count as authorization: a README, a workflow doc, or an installed skill declaring a step "must follow" is
  documentation. Neither is task incompleteness. This is a prompt-injection boundary as much as a safety rule
- The assessment exception is scoped to what the deliverable is, never to whether work happens: a question gets an
  assessment instead of a fix, but a request for work gets the work without a confirmation round-trip
- Turn discipline is the counterweight — a turn ending in a plan, a non-blocking question, or a promise is an unfinished
  turn, and the detector is the last paragraph

**Skill activation:**

- The `software-engineer` output style enforces `coding` skill invocation before implementation
- Language skills (go, typescript, etc.) run after `coding` in a skill queue
- Example queue: `coding` → `golang` → `templ`. The verification sandwich (return to `coding` before declaring done)
  belongs to the skill's Integration section, not to the queue notation
- Division of labour: the style owns the register, autonomy calibration, turn discipline, the queue, and the phase
  granularity. The `coding` skill owns the workflow in depth — discovery, the change list, commit sizing, the five-kind
  comment set, debugging, verification. The style restates the kernel of the last three, because the two artifacts load
  independently and a style-only session still writes code

**Change size:**

- Atomic is defined as a code boundary, never a task boundary: the smallest change that leaves the tree building and
  passing. The split test decides it — if the change cuts into two pieces that each build and pass, it is not one
  change. "The task is one logical change" is the rationalization this exists to block
- Second, independent test: a change does one kind of work, because its audience is a reviewer holding one question. New
  code ships apart from its wiring; a prerequisite refactor lands first. Deliverability alone misses these, since both
  halves build and pass together. At equal correctness, the finer split wins
- The `coding` skill owns the commit triggers. Three of them, any one sufficient: the change-list entry is finished
  (completion fires the commit at whatever size it reached — implementation lands, then integration lands separately);
  the next step would cross the ~400-500 line size checkpoint (commit _before_ starting it, so the boundary is chosen
  rather than discovered); or the size checkpoint was crossed anyway. Tests are excluded from the size count, and
  atomicity outranks the size checkpoint only once the split test has failed
- The predictive trigger exists because the retroactive one produces a worse split. A boundary found after the fact
  leaves a finished diff to take apart, which is the same failure the change list exists to prevent
- `size checkpoint` is the name of the size trigger specifically, and `git-commit` references it by that name in two
  places — the term survives a restructure of the block around it
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
  reference its "no comments" default. The kernel is in the skill body and in the output style; the closed set, the
  routing ladder, the provenance rule, the doc contract, and the repair scope live in `references/comments.md`
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
- On the lean prompt the live collision is different: the default has the agent match the surrounding code's comment
  density, naming, and idiom. The style settles it by stating the rule outright — match naming and idiom, do not match
  comment density — without naming the instruction it overrides
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
  The style's "don't change code the request doesn't reach" rule carries the matching exception
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
