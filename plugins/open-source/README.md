# open-source

Open-source contribution discipline for Claude Code — structured issue creation and pull request submission for external
projects.

## The Problem

Agent-generated issues and pull requests are consistently low quality. Maintainers call it "slop" — vague descriptions,
missing reproduction steps, generic prose that could apply to any project, references to functions that don't exist.
Projects like curl have shut down bug bounties entirely because of it. LLVM, Selenium, and Django have implemented
explicit AI contribution policies. The bar for agent contributions is higher than for humans, not lower.

The failure isn't in the code — it's in the communication. Agents produce output that compiles but submit it wrapped in
descriptions that waste maintainer time, violate project norms, and erode trust for all future AI contributions.

## The Solution

Two skills that cover the full contribution communication surface — one for issues, one for pull requests. Both enforce
a preparation-first workflow: read the project's guidelines, search for duplicates, verify every claim, then create the
deliverable. Both include anti-slop verification gates that catch the patterns maintainers use to detect AI-generated
content.

## Installation

```
/plugin marketplace add xobotyi/cc-foundry
/plugin install open-source
```

## Skills

### issue-writing

Issue creation discipline for external repositories. Covers bug reports (title formulas, reproduction steps, expected vs
actual, MRE construction, environment info) and feature requests (problem-first framing, proposed solution,
alternatives, scope awareness).

The preparation pipeline runs before any issue is written: read CONTRIBUTING.md and issue templates, search for
duplicates in both open and closed issues, verify the problem exists on the latest version, gather concrete evidence.
The verification gate checks factual accuracy (every reference verified against current source), completeness (template
compliance, specific titles), and anti-slop markers (no generic descriptions, no unverified speculation, no AI-typical
prose patterns).

**Use when:** filing bugs, proposing features, or preparing issue content for any external open-source project.

| References                     | Contents                                                                              |
| ------------------------------ | ------------------------------------------------------------------------------------- |
| `bug-report-structure.md`      | Full body template, title formulas, MRE construction, regression info, evidence rules |
| `feature-request-structure.md` | Research-backed engagement factors, body template, what gets requests closed          |
| `anti-slop.md`                 | How maintainers detect AI slop, stylistic/structural markers, project policies        |

### pr-contribution

Pull request submission discipline for external repositories. Covers PR descriptions (required and conditional elements,
anti-patterns, scaling to change size), titles (imperative mood, conventional commits, calibration examples), fork
workflow (setup, branch discipline, upstream sync, pre-submission cleanup), and contribution compliance (CLAs, DCOs, AI
transparency).

The preparation pipeline mirrors issue-writing: read CONTRIBUTING.md and PR templates, search for duplicate PRs and
related issues, read recent merged PRs to learn project conventions, verify legal requirements, scope the change to one
logical unit. The agent-specific discipline section addresses the seven failure modes unique to agent-generated PRs
identified in recent research.

**Use when:** submitting code changes, opening PRs from forks, writing PR descriptions, or preparing changes for
upstream submission to any external open-source project.

| References                   | Contents                                                                              |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| `pr-descriptions.md`         | Full description anatomy, templates, anti-patterns, scaling depth to change size      |
| `agent-pr-quality.md`        | Why agent PRs get rejected: seven failure modes, quality gaps, trust-building signals |
| `fork-workflow.md`           | Fork setup, branch discipline, upstream sync, pre-submission cleanup, review response |
| `contribution-compliance.md` | CLAs, DCOs, project guideline discovery, AI contribution transparency                 |

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
