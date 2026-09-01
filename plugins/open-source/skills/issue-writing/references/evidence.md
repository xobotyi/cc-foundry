# Measured Evidence

Every number here comes from a published source and carries its corpus and its caveat.

**No outcome base rate exists for agent-filed issues.** No study measures what fraction of issues filed autonomously by
an agent into a repository it does not maintain get acknowledged, fixed, closed, or rejected. Figures below describe
issues in general, machine-generated reports evaluated offline, or one project's security intake. None of them predicts
what happens to your report, and none should be quoted as if it did.

## The slop crisis, and its end

The most complete public record belongs to one project, curl, whose maintainer published figures at three points.

**July 2025 — the cost of a bad report.** curl averaged "about two security report submissions per week"; roughly 20% of
all submissions were AI slop, and about 5% of 2025 submissions "turned out to be genuine vulnerabilities". The security
team held seven members, and the review cost is stated exactly: "Every report thus engages 3-4 persons. Perhaps for 30
minutes, sometimes up to an hour or three. Each." (`https://daniel.haxx.se/blog/2025/07/14/death-by-a-thousand-slops/`)

**January 2026 — the program ends.** The confirmed rate had run "north of 15%" in earlier years and "plummeted to below
5%" starting 2025. curl ended its bug bounty on 31 January 2026 after a lifetime of "87 confirmed vulnerabilities and
over 100,000 USD" paid, explicitly "to remove the incentives for submitting made up lies".
(`https://daniel.haxx.se/blog/2026/01/26/the-end-of-the-curl-bug-bounty/`)

**April 2026 — the reversal.** After the bounty ended and reporting returned to HackerOne, the same maintainer wrote
"The slop situation is not a problem anymore." Report frequency roughly doubled against 2025, which had itself been more
than double prior years. The confirmed-vulnerability rate returned "to and even surpassing the 2024 pre-AI level,
meaning somewhere in the 15-16% range". And: "Almost every security report now uses AI to various degrees... The
difference now compared to before however, is that they are mostly very high quality."
(`https://daniel.haxx.se/blog/2026/04/22/high-quality-chaos/`)

**What this supports and what it does not.** It supports the claim that machine authorship does not determine report
quality, since the same intake channel produced a slop crisis and then near-universal AI assistance at its best
confirmed rate in years. It does not establish what caused the improvement: the monetary incentive, the platform, the
submitter population, and tool capability all changed together, and no analysis separates them. The maintainer's
cross-project confirmation — a list including Django, Firefox, git, the Linux kernel, Python, and Wireshark — comes from
what he calls "a quick unscientific poll on Mastodon".

## What belongs in a bug report

**The information mismatch.** A survey of 466 responses from developers and users of Apache, Eclipse, and Mozilla found
that "Most developers consider steps to reproduce, stack traces, and test cases as helpful, which are at the same time
most difficult to provide for users." The same work rated 289 bug reports and trained a quality predictor that was
accurate on 31–48% of reports. (`https://www.st.cs.uni-saarland.de/publications/details/bettenburg-tr-2008/`,
March 2008)

Two consequences. The highest-value elements are known and stable. And the reason reports lack them is difficulty, not
ignorance — which is precisely the constraint an agent does not share, since it can run the reproduction and capture the
trace.

The age of this source is a caveat for tooling and platform specifics and not for the ranking, which later work has not
overturned.

## Issue outcomes

**Closure is not resolution.** A study of 21,116 issues across 197 repositories in scientific-workflow software found
68.91% of issues closed, with half resolved within roughly 18 days. Closure counts duplicates, invalid reports, wontfix
and not-reproducible alongside fixes, so the figure cannot be read as a fix rate.
(`https://arxiv.org/html/2512.18852v1`) The population is one software domain.

**Rejection is often unlabeled.** Across 3,132 of GitHub's most-popular repositories, 29.6% — "about 30% of projects" —
apply a `wontfix` label to some issues, most often on user-submitted bug reports and feature requests. The study
identifies eight themes behind the label. (`https://arxiv.org/html/2510.01514v1`, October 2025) Prevalence of a labeling
practice is not a rejection rate: projects that decline work under other labels, or with none, are invisible to it.

**Duplicate rates are project-specific.** GitBugs aggregates over 150,000 bug reports from nine actively maintained
projects across GitHub, Bugzilla, and Jira. Its own summary: "Duplicate rates show considerable variation: VS Code and
Thunderbird both exceed 25%." (`https://arxiv.org/html/2504.09651v4`) No single cross-project duplicate prior is
defensible, which is the argument for searching rather than estimating.

## Feature requests

A study of feature requests drawn from 476 collected on two projects, with 50 randomly selected for manual analysis,
found that ambiguity and incompleteness are common while clarification is not: developers asked no clarifying question
in 39 of the 50. Where clarification did occur it centered on user intent, goals, and feasibility rather than technical
detail, and developers "usually focus on aligning with project goals rather than resolving unclear text."
(`https://arxiv.org/html/2507.13553v1`, CrowdRE'25)

Two projects and 50 manually analyzed requests is a small base. The direction — that an unclear request gets decided
around rather than clarified — is the usable finding; the proportions are not a population estimate.

## Machine-generated reports evaluated offline

IssueSpecter generated 10,467 candidate issue reports across 13 actively maintained Python projects from uncovered code
segments. Manual evaluation of its top-ranked reports judged 84.6% valid or warranting further investigation, with 15.4%
false positives. (`https://arxiv.org/html/2604.26118v1`)

This is a selected sample of a tool's highest-ranked output, judged by the researchers rather than by the projects'
maintainers. "Valid or warrants investigation" is not "a maintainer accepted it". Do not present it as evidence that
agent-filed reports are accepted at any rate.

## Platform mechanics worth knowing exactly

- **`required` on an issue form is public-repository-only.** GitHub's form schema documents `required` as "Prevents form
  submission until element is completed. Only for public repositories."
- **Private vulnerability reporting is separate from `SECURITY.md`.** GitHub: "Private vulnerability reporting is
  separate from a repository's `SECURITY.md` file. You can only report vulnerabilities privately for repositories where
  this feature is enabled, and you don't need to follow the instructions in `SECURITY.md`." Where it is not enabled,
  GitHub directs the reporter to the security policy or to asking maintainers for a preferred contact.
- **`gh issue create --template` takes a name, not a path.** The manual documents `-T, --template <name>` as "Template
  name to use as starting body text", with the example `gh issue create --template "Bug Report"`.
- **The GitHub CLI does not support YAML issue forms.** `cli/cli#5865`, "Support for issue forms", has been open since
  30 June 2022. A repository whose templates are `.yml` forms can return "no templates found" from the CLI while the
  forms render normally on the web.

## Severity conventions

Numeric scoring is not universal. curl's disclosure policy classifies vulnerabilities as low, medium, high, or critical
and does not use CVSS scores. No source reviewed here establishes that a reporter-supplied severity score improves
triage outcomes, and tracker priority — which does correlate with outcome in GitBugs — is assigned by maintainers during
triage rather than by the reporter.

## Embargo

Embargo length is project policy, not an ecosystem constant. curl informs the distros list "No more than seven days
before release", noting that "'distros' does not accept an embargo longer than 7 days", and merges the fix "No more than
48 hours before the release". (`https://curl.se/dev/vuln-disclosure.html`) Treat these as one project's numbers.

## Absences worth stating

Each of these was looked for and not found. Do not fill them with a plausible figure.

- Outcome rates for autonomously agent-filed issues.
- A general fraction of issues closed without any code action, separating bugs from feature requests.
- A measured effect of environment details, minimality of a reproducer, or a regression boundary on fix probability.
- A measured benefit from reporter-supplied severity scores.
- A universal reporting threshold for defects in nondeterministic systems.
- A platform field on GitHub issues recording machine authorship. GitHub documents AI-assisted triage for maintainers,
  which analyzes whether an issue is actionable — not whether it was machine-written.
