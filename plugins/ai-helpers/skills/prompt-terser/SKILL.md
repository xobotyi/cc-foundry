---
name: prompt-terser
description: >-
  Retrospective terseness audit for iteratively-edited prompts and skills.
  Applies mechanical wording cuts and proposes structural cuts with
  falsification gates. Invoke when auditing, tightening, compressing, or
  de-bloating a prompt.
---

# Prompt Terser

**Terser wording improves adherence.** For the same thought, fewer or clearer words usually produces more reliable model
behavior — less attention competition, smaller constraint surface, less noise in the instruction layer. The goal is not
to save tokens; the goal is to make the prompt work better. Token reduction is a side effect, not the target.

Prompts drift toward verbose wording across edit cycles. "Please make sure to" creeps in, rationale paragraphs stack,
hedges accumulate. This skill audits an existing prompt and proposes terser wording for the same semantic content —
every meaning preserved, every restatement compressed. Output is a diff-proposal with per-cut justification.

## When to invoke

- A skill, system prompt, output style, or agent prompt that has been edited many times
- Before shipping a skill update, as an adherence quality gate
- When a prompt feels verbose or repetitive on read
- When adherence is unreliable and verbose wording may be competing for attention

**Do not invoke for:**

- Newly authored prompts (use `prompt-engineering` — this skill is for drift, not authoring)
- One-shot user prompts (these don't drift)
- Prompts you intend to redesign — this skill preserves meaning, it does not change it
- Pure style or visual consistency refactors — terser is wording reduction for the same content, not format unification
- Token-budget squeezing that allows meaning loss — that's compression, a different operation

## Workflow

Three phases, ordered cheap-to-expensive:

1. **Wording pass** — mechanical substitution, near-zero risk
2. **Format pass** — mechanical whitespace and structure cleanup
3. **Structural pass** — drift-pattern detection with falsification gate

Each phase produces diff-proposal entries. Do not auto-apply structural cuts.

## Phase 1 — Wording pass (mechanical)

Apply these substitutions to the entire prompt body. Rewrite rules, not judgment calls.

- "in order to" / "so as to" → "to"
- "utilize" / "make use of" → "use"
- "implement a solution for" → "fix" / "solve"
- "It is worth noting that" / "It should be noted" → drop entirely
- "Please make sure to" / "Be sure to" / "Ensure to" → imperative verb
- "I want you to" / "You should" / "You need to" → imperative verb
- "might potentially" / "may possibly" → direct claim
- "very important" / "extremely critical" → "critical" or drop
- "the reason is that" / "due to the fact that" → "because"
- "extensive" / "comprehensive" / "thorough" → "full" or drop
- "however" / "furthermore" / "additionally" → drop or em-dash
- "in conclusion" / "to summarize" → drop
- Hedging adjectives ("appropriate", "reasonable") → concrete spec or drop
- Passive voice where active is clearer → active
- Articles where clarity survives → drop
- "A lot of" / "a number of" → "many" or specific count
- "the majority of" → "most"
- "be able to" → drop (where grammar holds)
- "absolutely" + modal verb ("absolutely must", "absolutely cannot") → drop "absolutely"
- Redundant "that" clauses → drop "that" where grammar holds
- "Remember that X" / "Note that X" / "Be aware that X" → state X directly (self-referential framing shifts attention to
  the reminder rather than the content)

### Emphasis exception

- **Keep emphasis** in critical-rule blocks at the top 20% or bottom 20% of the prompt (U-curve recency/primacy zones)
  and in safety guardrails — e.g., **"You must NEVER X"** rather than **"Never X"**
- **Keep emphasis** on rule-prefix bolds in bullet lists (`- **Lead with function.** ...`) and KV-list labels — these
  function as keys, not prose emphasis, regardless of zone
- **Strip emphasis** from descriptive prose, rationale paragraphs, and middle-zone content

## Phase 2 — Format pass (mechanical)

- Strip decorative blank lines between adjacent bullets of the same list
- Remove decorative separators (`---` used as section padding rather than as a real boundary)
- Collapse multi-line bullets that fit on one line without losing meaning
- Remove `**bold**` emphasis on terms that already appear as headings
- Convert tables to KV lists when entries are independent — apply the table test: if removing a column would lose
  comparative meaning, keep as table; otherwise convert
- Strip nested sub-bullets used only for visual breathing room (not for hierarchy)

## Phase 3 — Structural pass (falsification-gated)

Scan the prompt for the drift patterns below. For each candidate cut, apply the falsification gate before recommending.

### Two principles before scanning

**The U-curve.** Constraint compliance follows a U-shape against length: peaks at extreme compression (≤10 words), dips
in the ~20–40 word "ambiguity zone," then rises again for structured rubrics (≥150 words). The middle is worst —
medium-length narrative paragraphs degrade adherence even relative to either extreme. Every cut should push content out
of the ambiguity zone, not into it. Compress to <10-word imperative OR commit to a structured rubric; do not stop in the
middle.

**Narrative vs structural verbosity.** Not all verbosity is drift. Distinguish two types:

- **Narrative verbosity** — rationale paragraphs, background descriptions, "we believe / because past experience
  shows...". Low instructional density. Often ignored; sometimes triggers hallucinations. **Bloat — candidate for cut.**
- **Structural verbosity** — rubrics, checklists, decision tables, multi-step procedures with explicit constraints. High
  instructional density. Externalized memory the model can reference during generation. **Load-bearing — keep even when
  verbose.**

The test: does each token act as an active constraint, or as descriptive background? Active → structural. Descriptive →
narrative.

### Drift patterns to detect

- **Layered additions** — rules tacked on with "Also," / "And remember," / "One more thing" without merging into
  existing rule blocks. Sign: a rule block has rules that don't share a parent topic.
- **Rationale stacking** — inline "why" paragraphs added for each rule. If the rule is self-evident or its rationale
  lives in a reference, the inline rationale is bloat.
- **Style inconsistency that enables terser unification** — same content stated multiple times at different times in
  different formats. Flag ONLY when unification eliminates restated content (3 statements → 1 statement). Pure visual
  reformatting without word reduction is a style refactor, not a terser concern.
- **Duplicated constraints** — same rule restated in different sections. Sign: searching for the rule's key noun finds
  multiple imperatives saying the same thing.
- **Vestigial scaffolding** — examples or anti-patterns that no longer match the rules they were written for. Sign: an
  example references a term, behavior, or rule that no longer exists.
- **Persona / philosophy creep** — bookend "we believe" / "we value" / "the goal is" paragraphs grown over iterations.
  Sign: philosophy is >5% of total prompt length and contains 3+ such sentences.
- **Calibration prose** — paragraphs that explain to a human author why the rule exists, addressed to the reader rather
  than the model. Sign: the prose uses second-person addressing the human ("you might wonder why...").
- **Defensive hedging** — "in most cases" / "generally" / "as a rule of thumb" softening rules that should be hard.
  Sign: the surrounding context shows the rule is enforced strictly.
- **Ambiguity-zone paragraphs** — narrative paragraphs of ~20–40 words explaining a rule. Worst-case length for
  adherence. Either compress to a <10-word imperative or expand into a structured rubric/checklist. Sign: rule has
  one-paragraph rationale that isn't a checklist and doesn't fit on a single line.

### Falsification gate

Every structural cut must pass three checks, in order. State all three in the diff-proposal.

**1. Verbosity type:** is the content **structural** or **narrative**?

- **Structural** (rubric, checklist, decision table, multi-step procedure with explicit constraints) — externalized
  memory the model can reference during generation. **Load-bearing.** Reject the cut.
- **Narrative** (rationale paragraph, background description, "we believe / past experience shows...") — descriptive
  background, low instructional density. Proceed to check 2.

**2. Terseness:** does the cut reduce word/token count for the same semantic content?

- **Yes** — fewer words express the same thought. Proceed to check 3.
- **No** — token-neutral reorganization. Not a terser concern; reject the cut (it may be a style refactor — different
  operation).

**3. Behavior preservation:** if I delete this, what specifically changes in model output?

- **Vague** — "the prompt would be less thorough" / "the agent might be less careful". The content is **bloat**. Cut.
- **Concrete** — a specific input produces a different specific behavior. The content is **load-bearing**. Keep.

## Output format

Produce a single diff-proposal report:

```markdown
# Prompt Terser Audit — `<prompt-name>`

**Original:** N tokens. **Proposed:** M tokens. **Savings:** N − M (−X%).

## Phase 1 — Wording cuts (apply directly)

- **L12** — "in order to validate" → "to validate"
- **L34** — "Please make sure to check..." → "Check..."

## Phase 2 — Format cuts (apply directly)

- L40–L50: collapsed 6 single-line bullets that had blank lines between them
- L72: converted 3-row "Hook | When it fires" table to KV list (entries independent)
- L88: removed decorative `---` separator inside same logical section

## Phase 3 — Structural cuts (reviewer judgment)

### Cut 1 — L60–L65
**Pattern:** rationale stacking
**Removes:**
> "We document this rule because past incidents showed that agents often skipped validation when running in bypass
> mode. The cost of missed validation can compound across long sessions, so we want this to be explicit."

**Falsification:** if removed, the rule "always validate inputs before bypass mode" is still stated at L58. The model
sees no change in constraint surface; only the human reader loses context.
**Verdict:** Recommended cut. (If the rationale is valuable, move it to a comment in the commit message or a
reference, not the live prompt.)

### Cut 2 — L82–L84
**Pattern:** duplicated constraint
**Removes:** "Never auto-push to remote without explicit approval."
**Falsification:** the same rule appears at L21 in the Critical Rules section. Cutting L82–L84 leaves L21 intact.
**Verdict:** Recommended cut.
```

## Worked example

**Before** (excerpt from a hypothetical drifted skill, 67 words):

```markdown
## Validation

It is worth noting that in order to ensure the quality of the output, you should always make sure to validate the input
parameters before processing them. The reason we do this is that past experience has shown that invalid inputs can
cause a number of issues. Additionally, please be sure to log any validation failures so that we have a comprehensive
audit trail for debugging purposes.
```

**After Phase 1 (wording pass, 34 words):**

```markdown
## Validation

Validate input parameters before processing. Log validation failures for the audit trail.
```

**Cuts applied:**

- "It is worth noting that" → drop
- "in order to" → "to"
- "you should always make sure to" → imperative
- "The reason we do this is that past experience has shown that invalid inputs can cause a number of issues." → drop
  (rationale stacking — the rule is self-evident)
- "Additionally, please be sure to" → imperative
- "comprehensive audit trail for debugging purposes" → "audit trail"

**Phase 2 (format)** — no decorative whitespace to strip in this example.

**Phase 3 (structural)** — the dropped rationale sentence is flagged as Cut 1 with falsification: "if removed, the rule
'validate input parameters' is still stated. The model sees no change; only the human loses context."

Word count: 67 → 34 (~50%) with zero meaning lost. Same content, fewer words — the model's attention budget is no longer
competing with hedges, restatements, and stale rationale. Adherence improves; token reduction is the byproduct.

## Critical rules

- **Every cut must be terser AND meaning-preserving.** Same thought, fewer words. Token-neutral reorganization is a
  style refactor — not a terser cut. Reject it.
- **Adherence is the goal, not token reduction.** Terser wording reduces attention competition; tokens saved is the side
  effect, not the target.
- **Polarize, don't compromise.** Compliance peaks at ≤10-word imperatives and ≥150-word rubrics; it dips in the ~20–40
  word ambiguity zone. Push every cut to one extreme, not to the middle.
- **Distinguish narrative from structural verbosity.** Rubrics, checklists, and decision tables are externalized memory
  — load-bearing. Rationale paragraphs and background descriptions are bloat.
- **Behavior preservation is non-negotiable.** Flag any cut that might change model output for reviewer judgment.
- **Diff-proposal output only.** Never wholesale rewrite without review.
- **Keep emphasis at critical-rule boundaries.** Strip it from descriptive prose.
- **Existing prompts only.** Authoring is `prompt-engineering`; drift is here.
- **Mechanical cuts apply directly; structural cuts need falsification.**
- **Re-run after applying.** Earlier passes can hide drift behind surrounding bloat; another sweep often surfaces more.

## Related skills

- `prompt-engineering` — theory behind the rules applied here; load alongside for deeper rationale
- `skill-engineering` — skill-specific patterns (deletion test, KV-vs-table, description formulas)
- `output-style-engineering` — wording discipline applies equally to output styles
