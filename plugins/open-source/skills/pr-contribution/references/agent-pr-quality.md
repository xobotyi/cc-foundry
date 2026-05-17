# Agent PR Quality

Why AI-generated pull requests get rejected and how to avoid common failure modes. Based on research analyzing hundreds
of rejected agent PRs and maintainer feedback from major open-source projects.

## The Core Problem

Agent-generated PRs are accepted less often than human PRs. The gap is not primarily about code correctness — it is
about **context, judgment, and maintainer trust**. Code that compiles and passes tests can still be rejected because it
violates implicit project norms, introduces unnecessary complexity, or lacks evidence that the contributor understands
the change.

## Rejection Modes Unique to Agents

Research on 654 rejected PRs identified seven failure categories that appear **only** in agent-generated PRs:

- **Distrust of AI** — maintainers reject PRs specifically because the code was AI-generated and lacks evidence of human
  understanding. Some projects apply a "SLOP" label to mark low-value AI contributions.
- **Oversized PRs** — agents tend to produce larger, multi-purpose changes that are impractical for human review. All
  PRs rejected purely for size in the studied dataset were agent-generated.
- **Experimentation submissions** — PRs submitted to test an agent's capabilities rather than as sincere contributions.
- **Context limitations** — agents cannot access private data, resources in separate repos, or project-internal
  knowledge needed to complete changes correctly.
- **No added value** — changes that provide no clear benefit; technically functional but unnecessary.
- **Increased complexity** — solutions more complex than the problem warrants.
- **Deferred without resolution** — agents submit PRs and never follow up on feedback.

## Common Technical Failures

Compared to human-authored code, agent-generated PRs show measurably higher rates of:

- **Logic and correctness errors** — 75% more findings overall; business logic errors appear 2x as often; error handling
  gaps nearly double
- **Readability issues** — 3x more readability findings; formatting problems at triple the human rate; naming
  inconsistencies at 2x
- **Security vulnerabilities** — 1.5x higher overall; hardcoded credentials, unsafe hashing, injection weaknesses
- **Performance problems** — excessive I/O operations appear 8x more often (repeated file reads, unnecessary network
  calls)

## The Implicit Knowledge Gap

Most open-source projects rely on undocumented knowledge:

- Design decisions buried in old issues from years ago
- Conventions enforced socially rather than technically
- Trade-offs that only make sense with historical context
- Error handling expectations that downstream components rely on but are never written down

Agents do not know these things. Code that "works in isolation" can violate system-wide assumptions. Example: catching
and logging every exception can mask critical failures that other components expect to propagate.

## Quality Signals That Build Trust

To differentiate from low-quality agent PRs:

- **Link to an issue** — proves the change was requested, not invented
- **Explain the "why"** — demonstrate understanding of the problem, not just the fix
- **Keep changes small** — one logical change per PR; split large work into a series
- **Follow project conventions exactly** — formatting, naming, file organization, commit style
- **Include tests** — demonstrates the change works and the author thought about correctness
- **Acknowledge limitations** — mention what you did not address and why
- **Respond to feedback** — maintainers value contributors who engage with review comments
- **Do not over-engineer** — solve exactly the stated problem; resist adding abstraction layers, configuration flags, or
  "comprehensive" features nobody requested
