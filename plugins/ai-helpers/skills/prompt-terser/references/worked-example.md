# Worked example — one excerpt taken end to end

**Before** (excerpt from a hypothetical drifted skill, 67 words):

```markdown
## Validation

It is worth noting that in order to ensure the quality of the output, you should always make sure to validate the input
parameters before processing them. The reason we do this is that past experience has shown that invalid inputs can
cause a number of issues. Additionally, please be sure to log any validation failures so that we have a comprehensive
audit trail for debugging purposes.
```

**Phase 0 (inventory)** — no commands, paths, numbers, or other load-bearing literals in this excerpt; all categories
attested empty.

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

**Phase 2 (format)** — no decorative whitespace to strip in this excerpt.

**Phase 3 (structural)** — the dropped rationale sentence is flagged as Cut 1 with its falsification: "if removed, the
rule 'validate input parameters' is still stated. The model sees no change; only the human loses context."

Word count: 67 → 34 (~50%), no meaning lost.
