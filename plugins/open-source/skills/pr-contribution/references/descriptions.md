# Titles and Descriptions

Anatomy, calibration, and scaling for the title and body a reviewer reads first.

The description is a permanent record. Google's guidance frames the audience correctly: it "will become a permanent part
of our version control history and will possibly be read by hundreds of people over the years", and future readers
searching for the change find it by this text. Source code shows what the software does; only the description says why
it exists.

## The title

One line, carrying a triage decision.

- **Imperative mood**, as an order: "Delete the FizzBuzz RPC and replace it with the new system", not "Deleting" or
  "Deleted".
- **What the change does**, not what area it touches. "Update CSS" names a directory; "Refine grid layout for mobile
  responsiveness" names a change.
- **Standalone.** A reader skimming history should not need to open the PR to know what it did or how it differs from
  its neighbors.
- **Match the project's convention** — check recent merged PRs for conventional-commit prefixes, ticket references, or
  component tags, and follow what you find.
- **Short**, roughly 70 characters where the content allows.

Calibration, weak against strong:

- "Fix bug" → "Fix login button unresponsive on Safari"
- "Update CSS" → "Refine grid layout for mobile responsiveness"
- "Changes for tax calculation" → "Add Swiss tax calculation for new regulation"
- "Phase 1" → "Add rate limiting to authentication endpoint"
- "Add convenience functions" → "Add helpers for parsing ISO-8601 durations in the config loader"

"Fix build", "Add patch", "Moving code from A to B", and "Phase 1" are all real descriptions from Google's collection of
inadequate ones. Short is not the defect; uninformative is.

With conventional commits, where the project uses them:

```
fix(auth): resolve session expiry race condition
feat(api): add rate limiting to public endpoints
docs(readme): update installation instructions for v3
```

## The body

Four things a reviewer cannot get from the diff:

- **Problem** — what was wrong, missing, or needed, and why it matters. Link the issue with a closing keyword
  (`Closes #42`) so the tracker stays consistent.
- **Approach** — why this solution. Name alternatives where the choice is not obvious. This is the part reviewers spend
  their time on: the decision, not the syntax.
- **Verification** — what you ran and what it showed. Name the commands and the environments. Where something could not
  be verified, say which and why.
- **Boundaries** — what was deliberately not addressed, and any known shortcoming or deferred work. Stating the edge
  prevents a reviewer from expanding the scope on your behalf.

Add when they apply: before-and-after screenshots for any visual change, migration notes where others must act,
benchmark figures where performance is the point, and links to design documents or related PRs.

Where AI assistance requires disclosure, it goes here unless the project specifies a trailer or checkbox instead.

A worked shape, adapted from Google's functionality-change example:

> **RPC: Remove size limit on RPC server message freelist.**
>
> Servers like FizzBuzz have very large messages and would benefit from reuse. Make the freelist larger, and add a
> goroutine that frees the freelist entries slowly over time, so that idle servers eventually release all freelist
> entries.

The first words say what it does; the rest gives the problem, the reason this solution, and the implementation detail
that a reviewer would otherwise have to reconstruct.

## Scale it to the change

- **Typo or one-liner** — the title carries it; one sentence of body at most.
- **Focused bug fix** — problem, cause, fix, how it was verified.
- **Feature** — the full four elements, plus screenshots or examples of the new behavior.
- **Large refactor** — the full shape plus migration notes, and the plan if it spans several PRs.

Over-explaining a trivial change spends the same reviewer attention that the discipline exists to protect. Three
paragraphs on a typo fix is not thoroughness.

## Templates

Where `.github/pull_request_template.md` exists, it is the required shape. Fill every section. Do not delete the ones
that seem inapplicable — write "N/A" and let the reviewer see that it was considered. Check the checkboxes that are
true, and only those; an unchecked box is information, and a falsely checked one is a false statement about work you did
not do.

Where no template exists:

```markdown
## What

[What changed, in a sentence or two]

## Why

[The problem, and why this approach]

## Testing

[What was run, and what it showed]

## Related

- Closes #[issue]
```

## Anti-patterns

- **Diff narration.** "Changed line 42 from X to Y" restates what the reviewer is already looking at. Describe intent.
- **Empty descriptions.** They force the reviewer to reconstruct intent from code. Never acceptable, at any size.
- **Filler.** "This comprehensive PR improves the overall quality of..." says nothing and reads as generated. Prose
  discipline for anything longer than a few lines belongs to `the-writer:humanize`.
- **Unearned confidence.** "Fully tested" and "no breaking changes" are claims. Either show the evidence or soften them
  to what you actually know.
- **Deleted template sections.** Removing a heading you did not want to answer is visible in the diff against the
  template.
