# Naming

What makes a name carry its own explanation, and what bounds a rename of a symbol that already exists. The skill body
carries the ratio these rest on; this file carries the shapes and the limits. The rules are language-agnostic — the
spelling each one takes is the language's own convention.

## What a Better Name Looks Like

<naming-rules>
- **Name a predicate as the question it answers.** `can` — would the operation succeed. `is` — a property of
  the thing itself. `has` — a containment check. The distinction is universal; the spelling is the language's
  (`IsEmpty`, `is_empty`, `empty?`). A predicate named for a mood instead of a question — `fragile`,
  `worthIt`, `check` — is what forces the explanation above it.
- **A magic number is a comment in the wrong place.** A value whose meanings live in a comment
  (`mode: 0 = eager, 1 = lazy, 2 = off`) is a named set refusing to be written. Write it as whatever the
  language offers — an enum, typed constants, a union of literals — and the meaning list dissolves into every
  use site at once. The same goes for a boolean parameter whose two values need a comment at the call.
- **One mechanism, one family word.** When one mechanism surfaces under several names, one word runs through
  all of them: `push`, `pushClone`, `pushFrom`. A member named out of a second vocabulary sends the reader
  hunting for a difference that is not there.
- **Name for the use site, not the declaration.** `cfg` reads fine where it is declared and says nothing where
  it is used; `callerCfg` and `moduleCfg` say it in both places. This binds hardest on a value read far from
  its declaration — a field used inside a long method, a variable that outlives the block that set it.
- **A diagnostic names the concrete thing.** When the code knows which file, which field, which value, the
  message says which one. "Invalid input" asks the reader to trust you. A message that reaches a user carries
  no vocabulary that exists only inside the implementation.
</naming-rules>

## Renaming an Existing Symbol

The limit on a rename is its blast radius, never how much better the new name is.

<rename-limits>
- **Private symbol** — free, inside the scope you already have. Rename it in the same change when it is a
  symbol the change touches or that you read to make the change; a private name elsewhere in the codebase is
  not yours to rename on the way past.
- **Public symbol** — the name is API surface. Rename it with its callers in the same change when every
  caller already sits in a file this change touches; grep them first, and if one lands outside, the rename is
  a change of its own kind and does not ride along with unrelated work.
- **Published in generated documentation** — frozen. Verify before proposing it (grep the docs tree); for a
  frozen symbol the rescue falls back to a doc comment, or drowns.
</rename-limits>

A rename that cannot land is not the end of the road: the fact it would have carried re-enters the routing ladder in
[`comments.md`](comments.md), one rung down.
