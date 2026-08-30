# 0008 — Comments are a closed set of five kinds, not a judgment call

- **Status:** accepted
- **Date:** 2026-08-24
- **Supersedes:** the "comments carry the non-obvious WHY" clause of [0007](0007-coding-skill-owns-comment-policy.md);
  the rest of 0007 stands

## Context

0007 gave the `coding` skill a comment policy built as a filter: comment the non-obvious WHY, and here are three cases
that read like a WHY and are not. Agents kept producing commentary anyway.

The filter cannot win, because the model supplies both the candidate and the verdict. "Comment the non-obvious why"
reads as an instruction to write a comment, narrowed to a category — and a model asked to find a non-obvious why finds
one in every function. Every rule 0007 shipped was a rejection criterion applied to a comment the model had already
decided to write. Nothing operated before that decision.

A second defect was structural rather than a matter of degree. "Comment the WHY" is correct when the agent authored the
decision and wrong when the agent is documenting code it merely read: intent leaves no trace in source, so a WHY
recovered by reading is a guess. The rule instructed agents to invent, and a confidently wrong reason is worse than
silence — it survives review, is never re-checked, and makes the next maintainer defend a constraint nobody imposed.

Prior art: the daScript house workflow (`daslang.io/blog/no-comment.html` and the twelve agent definitions under
`.claude/agents/`, captured in `plugins/ai-helpers/skills/output-style-engineering/.dev/reference/`). Comments are
stripped mechanically before code lands, but a rescue pass first extracts what they knew into names, review rules, and
architecture notes. The mechanical strip is what makes it work — the author never negotiates with themselves about
whether a comment is good enough. Their "cave with no comments" experiment supplies the epistemic half: reconstructed
commentary must mark inferred purpose as hypothesis (`why?:`), and `why?: unknown` outranks a plausible invention.

## Decision

The default is zero comments, enforced as an enumerated set rather than a test the model applies to its own output. Five
kinds may exist; nothing outside the list is written.

- Doc comments on public symbols — a different artifact with a different reader
- The justification on an escape hatch — any construct suppressing a check or leaving the language's guarantees, in
  whatever syntax that language uses to carry a reason
- `shortcut: <ceiling> — <upgrade trigger>`
- `constraint: <fact>` — a fact outside this file that the code cannot express and no name can carry
- `why?: <hypothesis>` — inference about code the agent did not author

Four of the five are markers with fixed grammar (one line, present tense, greppable), so the permitted set cannot grow
back into prose. There is deliberately no "genuinely useful comment" escape hatch: that judgment is the mechanism this
ADR removes.

**The policy governs commentary only.** Comment-syntax a tool parses — build tags, `// Output:`, linter and type-checker
directives, JSDoc type annotations, codegen pragmas — is program text in comment clothing, and deleting one changes what
builds, runs, or gets checked. It is outside the policy rather than a sixth kind, on the same footing as a shebang. The
class is defined by that property; no enumeration of it could be complete, so the skill names examples and says so.

Kinds are stated as properties for the same reason. Kind 2 is not the pair `SAFETY:`/`nolint:` but the general rule that
an escape hatch carries its justification, which reaches a language this marketplace never names.

Three rules support the set:

- **Rename before commenting.** A comment whose payload fits in an identifier is a naming defect. The blast-radius
  limits that decide whether the rename lands in the change at hand live in the `coding` skill's `references/naming.md`,
  which is their one home; restating them here is what leaves a decision record contradicting the rule it supports.
- **Provenance gates every WHY.** A reason the agent holds is stated plainly; a reason inferred by reading is marked
  `why?:` or omitted.
- **A routing ladder replaces delete-only** — name, test, doc comment, rule document, architecture doc, marker, drown.
  Drown is the default verdict and is silent. The ladder exists to make deletion cheap: an agent with nowhere to put a
  fact hoards it in a comment.

`constraint:` exists because routing alone loses the one case that matters. An external-world fact filed in an
architecture doc is invisible to the next person editing the line it constrains, who deletes the guard and ships the
bug. It is scoped narrowly and given marker grammar so it cannot become the escape hatch the closed set forbids.

The codebase-conflict rule inverts here. Elsewhere in `coding`, the codebase wins and the divergence is flagged; for
comments, a comment-heavy convention neither licenses writing new comments nor authorizes stripping existing ones.
Repair stays scoped to files edited and symbols read.

Doc comments keep the reader test from 0007 and it is stated more strongly: the reader is a caller holding the signature
and nothing else, a convention can demand the slot exists but cannot supply a word of its content, and a doc that needs
a paragraph is a finding about the signature.

## Consequences

- Language skills asking for "a comment" on an escape hatch (`!`, `any`, `@ts-expect-error`, an ignored `defer` error)
  were reworded as justifications, which kind 2 covers as a property rather than by naming each syntax.
- The sweep reached `references/`, not only SKILL.md: shell file headers, CLI config annotation, Python side-effect
  imports, and Go's unexported-type and inverted-guard advice all instructed comments the set excludes.
- `git-commit` routed facts out of commit messages and into code comments. It now routes them into the artifact -- a
  name, a test, a doc comment, or a project document.
- Go's "signal boosting" convention — comment the surprising inversion — became name the condition instead. Naming
  removes the surprise; the comment only flags it and can go stale.
- Compliance is now checkable. A closed set can be audited by grep or by a review agent; "write a good WHY comment"
  cannot be audited by anything.
- On classic-prompt models the default system prompt still permits a free-form comment for a non-obvious WHY. The skill
  states that the closed set overrides it, replacing 0007's assumption that the two agree.
- The set is closed on purpose and adding a sixth kind is a decision that amends this ADR. Pressure to add one is the
  expected failure mode, since every individual case will look like the deserving exception.
- Nothing here reaches doc comments, which the language skills continue to require on exported symbols.

Shipped in the-coder v1.13.0.
