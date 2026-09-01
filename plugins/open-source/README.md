# open-source

Open-source contribution discipline for Claude Code — structured issue creation and pull request submission for external
projects.

## The Problem

Agent contributions fail on process, not on code. In 562 categorized rejections of agent-authored pull requests, the
largest cause was reviewer abandonment at 38%, followed by duplicate submissions at 23% and CI failures at 17% —
incorrect implementations accounted for 3%. Meanwhile projects have written rules to defend themselves, and agents do
not read them: measured across four frontier models, agents opened a repository's AI policy file in 3.5% of unaided
runs, and in repositories that ban AI contributions outright they refused 0% of the time.

The failure isn't in the code — it's in everything around it. Agents produce output that compiles, then submit it into
projects whose rules they never found, duplicating work that already exists, to reviewers nobody arranged.

## The Solution

Two skills covering the artifacts maintainers see — one for issues, one for pull requests. Both put the project's own
rules first: find them, classify what they demand, and satisfy it before writing anything. Both draft for a human to
submit, and neither asks an agent to sound human. The objection maintainers actually raise is to unreviewed output, so
the gates check evidence — was it reproduced, was it searched for, was the claim run — rather than writing style.

## Installation

```
/plugin marketplace add xobotyi/cc-foundry
/plugin install open-source
```

## Skills

### issue-writing

Issue creation discipline for external repositories. It routes before it drafts — a suspected vulnerability never
reaches a public tracker, and the security channel gets looked up per report rather than remembered, because one project
moved its route four times in a year.

From there it works what the evidence supports. Developers rank reproduction steps, stack traces, and test cases most
useful and reporters find them hardest to supply, which is the gap an agent can actually close by running the
reproduction and capturing the trace. The skill covers bug, feature, and vulnerability shapes, duplicate search,
disclosure wording, intermittent defects that will not reproduce on demand, and the GitHub CLI defect that silently
skips YAML issue forms.

**Use when:** filing bugs, proposing features, reporting a suspected vulnerability, or preparing issue content for any
external open-source project.

References:

- **`evidence.md`** — the measured record: report elements, closure and duplicate rates, the slop crisis and its end
- **`policies.md`** — the four demands projects make, disclosure wording, canary instructions, security routing
- **`mechanics.md`** — templates versus YAML forms, the CLI limitation, duplicate search, private reporting
- **`report-shapes.md`** — titles and bodies for bug, feature, and vulnerability reports

### pr-contribution

Pull request submission discipline for external repositories. The skill starts where the measurements say the failures
start: finding the project's AI-contribution rules before any code is written, classifying them as refuse, disclose,
verify, or handoff, and taking the one correct action for each. A ban ends the work and gets reported to the user.

From there it works the causes in order of measured weight — search for the duplicate, get a human to expect the change,
size it to the reviewer, clear the project's gates — then covers titles and descriptions, disclosure trailers, DCO and
CLA handling, fork mechanics, and the review response. Every threshold it states carries the corpus behind it, and the
rules that acquit are named as explicitly as the ones that convict.

**Use when:** submitting code changes, opening PRs from forks, writing PR descriptions, or preparing changes for
upstream submission to any external open-source project.

References:

- **`policies.md`** — the four rule types, where rules live, trailer syntax, DCO and CLA mechanics, named examples
- **`evidence.md`** — measured rejection taxonomy, acceptance rates, compliance rates, with corpora and caveats
- **`mechanics.md`** — fork setup, upstream sync, `gh` invocation, maintainer edits, review response
- **`descriptions.md`** — title and description anatomy, templates, scaling, anti-patterns

## Skill Dependencies

The two skills are complementary but independent. `issue-writing` covers filing issues; `pr-contribution` covers
submitting code changes. Both include their own preparation pipeline. When filing an issue and then submitting a fix,
invoke both skills sequentially — file the issue first, then reference it in the PR.

Neither skill covers the actual implementation work — that comes from `the-coder` and language-specific plugins. Neither
skill covers commit message formatting — that comes from `git-commit`.

## Related Plugins

- **git-commit** — Commit message discipline (atomic commits, message formatting, trailers)
- **the-coder** — Language-agnostic coding discipline (discovery, planning, verification)
- **the-blueprint** — Internal planning pipeline (design, task creation, decomposition)

## License

MIT
