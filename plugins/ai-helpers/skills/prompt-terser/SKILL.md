---
name: prompt-terser
description: >-
  Retrospective terseness audit for iteratively-edited prompts and skills.
  Applies mechanical wording cuts and proposes structural cuts with
  falsification gates. Invoke when auditing, tightening, compressing, or
  de-bloating a prompt.
---

# Prompt Terser

**Prompts drift.** Each edit adds — rarely removes. Over iterations, "please make sure to" creeps in, rules get restated
in different sections, rationale paragraphs stack, decorative formatting bloats whitespace. Even prompts authored with
sound prompt engineering accumulate bloat through _time_, not authoring failure.

A **retrospective audit pass** on an existing prompt. **Behavior is preserved**; bloat is removed. Output is a
diff-proposal with per-cut justification — a reviewer decides what to apply.

## When to invoke

- A skill, system prompt, output style, or agent prompt that has been edited many times
- Before shipping a skill update, as a quality gate
- When a prompt feels long or repetitive on read
- When a prompt exceeds a token budget and behavior must stay intact

**Do not invoke for:**

- Newly authored prompts (use `prompt-engineering` — this skill is for drift, not authoring)
- One-shot user prompts (these don't drift)
- Prompts you intend to redesign — this skill preserves behavior, it does not change it

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

### Drift patterns to detect

- **Layered additions** — rules tacked on with "Also," / "And remember," / "One more thing" without merging into
  existing rule blocks. Sign: a rule block has rules that don't share a parent topic.
- **Rationale stacking** — inline "why" paragraphs added for each rule. If the rule is self-evident or its rationale
  lives in a reference, the inline rationale is bloat.
- **Style inconsistency** — sections edited at different times use different formats (some bullets, some prose, some
  tables) for the same kind of content. Sign: same content type has two presentations in the same prompt.
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

### Falsification gate

Before recommending a structural cut, answer in one sentence:

> _If I delete this, what specifically changes in model output?_

Then classify the answer:

- **Concrete** — a specific input produces a different specific behavior. The content is **load-bearing**. Keep.
- **Vague** — "the prompt would be less thorough" / "the agent might be less careful". The content is **bloat**. Cut.

State the answer in the diff-proposal.

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

Token reduction: ~50% with zero behavior change.

## Critical rules

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
