# PR Description Anatomy

Guidance for writing pull request descriptions that serve both reviewers and future historians.

## Structure

A PR description has three functional zones: summary, body, and metadata.

### Summary (First Lines)

- One-sentence summary of **what** the PR does — imperative mood, standalone meaning
- Must be informative enough that someone skimming history understands the change without reading the diff
- Follow with a blank line

**Good summaries:**

- "Fix login button unresponsive issue on Safari"
- "Add rate limiting to the authentication endpoint"
- "Remove deprecated FizzBuzz RPC and replace with new system"

**Bad summaries:**

- "Fix bug" — what bug? what fix?
- "Update code" — says nothing
- "Phase 1" — meaningless without context
- "Add convenience functions" — which functions? for what?

### Body

The body answers **why** this change exists and **how** it works at a high level.

**Required elements:**

- **Problem statement** — what was wrong or missing, and why it matters
- **Approach** — why this specific solution was chosen; mention alternatives considered if the choice is non-obvious
- **Trade-offs** — any shortcomings, known limitations, or deferred work
- **Scope boundaries** — what was explicitly NOT addressed (prevents reviewer scope creep)

**Conditional elements (include when applicable):**

- **Testing description** — how the changes were verified; what scenarios were tested
- **Visual evidence** — before/after screenshots or GIFs for any UI changes
- **Migration notes** — if the change requires action from other developers or users
- **Performance data** — benchmarks if the change affects hot paths

### Metadata Links

- **Issue references** — use closing keywords: "Closes #42", "Fixes #123"
- **Related PRs** — link to prerequisite or follow-up PRs
- **Design docs** — link to relevant RFCs, ADRs, or design documents
- **@mentions** — tag the issue author ("cc @reporter") and specific reviewers if needed

## PR Templates

Many projects provide PR templates (`.github/pull_request_template.md`). When a template exists:

- Fill every section — empty template sections signal low effort
- Do not delete sections; write "N/A" if genuinely not applicable
- Use the template's checklist — check off completed items with `[x]`

When no template exists, use this minimal structure:

```markdown
## What

[One paragraph: what changed and why]

## How

[Key implementation details — not a line-by-line walkthrough, but the approach]

## Testing

[How you verified the changes work]

## Related

- Closes #[issue]
- [Links to related PRs, docs, or discussions]
```

## Description Anti-Patterns

- **Diff narration** — restating what the code diff already shows ("changed line 42 from X to Y"). Describe intent, not
  mechanics.
- **Wall of text** — unstructured paragraphs. Use headers and bullet lists.
- **Empty descriptions** — forces reviewers to reverse-engineer intent from code. Always unacceptable.
- **AI slop markers** — generic phrases like "This comprehensive change improves...", "This PR enhances the overall...",
  "I've made the following improvements...". Write like a human engineer explaining their work to a colleague.
- **Over-explanation of trivial changes** — a typo fix needs one line, not three paragraphs.

## Scale Description to Change Size

- **Typo/one-liner** — title is often sufficient; one sentence in body
- **Focused bug fix** — problem, root cause, fix approach, test plan
- **Feature addition** — full structure: what/why/how/testing/scope
- **Large refactor** — full structure plus migration notes and rollback plan
