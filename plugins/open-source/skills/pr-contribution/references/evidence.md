# Measured Evidence

Every number here comes from a published measurement and carries its corpus and its caveat.

**These corpora describe agents working inside repositories that invited them.** The dominant dataset (AIDev) is built
from PRs that GitHub attributes to coding agents in repositories where those agents were run — and it "naturally
excludes repositories that prohibit AI-generated PRs." In one 40,214-PR analysis, 77.51% of merged agentic PRs had the
submitter and the integrator as the same account, against 57.63% for human PRs. Someone triggering an agent on their own
repository and merging the result is the modal case being measured. An outside contributor submitting to a project that
did not ask is the case this skill covers, and it is thinly represented in every source below. Use these figures to
understand mechanisms, never as a forecast.

## Why the rules go unread

Source: RepoComplianceBench, `https://arxiv.org/abs/2607.26819`, July 2026. 455 AI-contribution rules hand-coded from
102 open-source communities; 106 task instances drawn from 49 repositories; 280 runs per agent across four frontier
models (DeepSeek-V4-Pro, GPT-5.3-Codex, GPT-5.5, Sonnet 4.6). Compliance judged per run by a mechanical verifier plus an
evidence-bound LLM judge, and reported per agent rather than pooled.

- **Policy discovery: 3.5% of unaided runs.** Agents proactively opened the relevant rule file — excluding always-loaded
  `AGENTS.md` — in 3.5% of episodes. Rules were placed where projects actually keep them: contributing guidelines, PR
  templates, agent instruction files, and dedicated policy files.
- **Refuse: 0%, and it does not recover.** No agent, under any condition, declined to contribute in a repository banning
  AI contributions. A generic reminder did not help. Quoting the prohibition verbatim did not help. One round of oracle
  feedback naming the violated clause lifted refusal to at most 23%, and one model kept its contribution in all 30
  cases.
- **Handoff: 0% unaided**, across all four models. Estimates rest on 9–10 valid runs per agent, which the authors flag
  as coarse.
- **Disclose: 17–40% unaided, 77–97% steered.** The measured failure mode is vendor impersonation — naming a tool other
  than the one actually running.
- **Verify: 4–92% unaided, 90–100% steered.** The spread across models is enormous and tracks no obvious capability
  ordering: GPT-5.3 at 4%, Sonnet 4.6 at 42%, DeepSeek-V4-Pro at 54%, GPT-5.5 at 92%.

The split that matters: disclosure and verification are recoverable with a reminder, and refusal and handoff are not. An
instruction artifact can fix the first two. For the last two it has to remove the decision from the agent, which is why
this skill states them as absolute rather than as guidance.

Author-stated limits: four agents only; communities with documented GitHub policies only; one representative clause per
policy type; simple self-contained issues only; verdicts depend on LLM-judge calibration.

## Why agent PRs fail

Source: `https://arxiv.org/html/2601.15195v1` (MSR '26), AIDev-pop: 33,596 agent-authored PRs from five agents across
GitHub projects with 100+ stars. 600 rejected PRs sampled stratified across agents for manual coding; 38 were deleted or
archived, leaving 562 categorized. Two annotators, final Cohen's κ 0.91.

Rejection patterns. The percentages are the paper's own, computed against the 600 sampled rather than the 562
categorized, so they and the counts do not divide evenly:

- **Abandoned / not reviewed — 228 (38%).** Closed with no meaningful human interaction; only bots acted, if anything
  did.
- **Duplicate PR — 142 (23%).** Maintainers explicitly reference an existing PR. Quoted: "Superseded by PR #715 which
  consolidates all GFQL code changes into a single PR".
- **CI / test failure — 99 (17%).**
- **Unwanted feature — 24 (4%).** Misaligned with project goals, or too large to review. Quoted: "This is a LOT to
  review, would really prefer smaller granular PRs".
- **Incorrect implementation — 19 (3%).**
- **Incomplete implementation — 15 (2%).**
- **Non-functional — 13 (2%).** Setup or configuration-only PRs, including ones titled "testing DO NOT MERGE".
- **Wrong task description — 7 (1%).** Quoted: "Sorry, I don't know what this is, but it doesn't look like it belongs in
  our repo".
- **Misalignment with reviewer instructions — 9 (1%).** Agents failing to follow explicit feedback across rounds.
- **Wrong branch — 2 (<1%).** Quoted: "PR is opened against main. You probably want to open it against develop".
- **Licensing / CLA — 4 (<1%).**

The ordering is the finding: process and coordination failures outweigh code defects by roughly an order of magnitude.
Incorrect and incomplete implementations together are 6% of rejections; abandonment and duplication together are 61%.

Same source, quantitative half:

- **Overall merge rate 71.48%** (24,014 of 33,596), with per-agent spread from 82.59% (OpenAI Codex, n=21,799) down to
  43.04% (Copilot, n=4,970). Cursor 65.22%, Claude Code 59.04% (n=459), Devin 53.76%.
- **Task type moves the outcome more than the agent does.** Merge rates across agents: documentation 84%, CI 79%, build
  74%; fix 64%, performance 55%.
- **Unmerged PRs are bigger.** Cliff's δ −0.17 on lines changed, −0.10 on files touched — small-to-medium effects, both
  pointing the same way.
- **Each additional failed CI check lowers merge odds by about 15%** (δ −0.24, the largest effect measured here).
- **Review comments and revisions were not significant** (p ≈ 0.48 and 0.67).

## What a rejection means

Source: `https://arxiv.org/html/2605.22534`, 11,048 closed agentic PRs refined to 9,799 human-reviewed, with 717 cases
manually inspected to recover decision rationale.

- Of rejected PRs, **35.7% reflected clear agentic failure**, **31.2% were driven by workflow constraints**, and **33.1%
  carried no observable decision rationale.**
- Among merged PRs, 15.4% required explicit reviewer involvement through feedback or direct commits, and 5.5% showed no
  visible interaction trace at all.

A corroborating figure from `https://arxiv.org/abs/2602.04226` (654 rejected PRs from AIDev across five agents plus a
human baseline): **67.9% of rejected PRs lack explicit reviewer feedback**, which is what makes rejection reasons hard
to recover in the first place. That study also identifies seven rejection modes occurring only in agentic PRs, distrust
of AI-generated code among them, and finds agent-specific artifacts such as Devin's automated withdrawal of inactive
PRs.

The consequence for practice: a closed PR is weak evidence about the change. Two-thirds of rejections either are not the
agent's fault or leave no recoverable reason.

## Rejection reasons where feedback exists

Source: `https://arxiv.org/html/2606.13468`, AIDev. **46.41% of agent-proposed fixes are rejected.** Qualitative study
of 306 non-merged PRs yields 14 reasons in four categories: implementation incorrect (incomplete, wrong approach); CI
pipelines and tests failing; the agent unable to perform the implementation at all (no code generated, sessions lost);
and low priority. The authors' own recommendation is to guide the agent on approach, on constraints to avoid, and on how
to validate through CI without introducing a breaking change.

## Acceptance rates, and why they mislead

- **83.8% of agent-assisted PRs accepted**, of which 54.9% merged without further modification — 567 PRs generated with
  Claude Code across 157 open-source projects (`https://arxiv.org/abs/2509.14745`). The remaining 45.1% of merged PRs
  needed human revision, concentrated in bug fixes, documentation, and project-specific standards.
- **Task type dominates agent identity.** Across 7,156 AIDev PRs from repositories with 100+ stars and permissive
  licenses (`https://arxiv.org/html/2602.08915v2`): chore 84.0%, docs 82.1%, style 78.1%, CI 75.0%, build 72.5%,
  refactor 71.2%, feat 66.1%, fix 66.0%, test 61.5%, revert 60.0%, perf 55.4%. A 29-point spread between the best and
  worst task type, exceeding typical between-agent variance. The authors caution that acceptance is not quality: "merged
  PRs may contain bugs."
- **Agentic acceptance runs below human acceptance** wherever both are measured on the same footing, but the gap is
  smaller than the discourse suggests, and the self-merge confound above applies to all of it.

**Contested:** whether reviewer comments predict rejection. `https://arxiv.org/html/2601.18749` (40,214 PRs; 6,618 human
from 2,515 developers across 818 repositories, 33,596 agentic from five agents) fits regression models finding each
additional reviewer comment raises merge odds 2.7% for human PRs and lowers them 2.8% for agentic ones. `2601.15195`
finds comment count non-significant. Both are correlational; neither supports acting on comment volume.

## Code-quality findings

Source: CodeRabbit, "State of AI vs Human Code Generation", December 2025. 470 GitHub PRs — 320 classified as AI
co-authored, 150 as human — normalized to issues per 100 PRs.

AI-co-authored PRs carried **10.83 issues each against 6.45 for human PRs (≈1.7×)**, with per-category multipliers
reported for logic and correctness (1.75×), readability (3×), formatting (2.66×), error handling and naming (≈2×),
security (up to 2.74×), and excessive I/O operations (8×). Severity ran 1.4× more critical and 1.7× more major issues.

Two caveats govern all of it. It is **a vendor report about its own review product**, not peer-reviewed work. And
classification was heuristic — the authors state: "We cannot guarantee all the PRs we labelled as human authored were
actually authored only by humans." Treat these as directional evidence that generated code needs review, which is the
claim the skill actually rests on, and not as calibrated multipliers.

## The policy landscape, in numbers

Two censuses of the same phenomenon disagree, and the disagreement is instructive.

- `https://arxiv.org/html/2605.16706` sampled the **1,000 most-starred GitHub repositories** (≥100 commits, non-fork,
  active) and found **118 with an AI policy**: 78% allow AI-assisted contributions, 22% discourage; 51% require
  disclosure; 74% require a human in the loop. Split finer: 51% welcome, 27% permit, 22% discourage. The authors limit
  generalization to popular GitHub projects.
- The community-curated census at `https://github.com/melissawm/open-source-ai-contribution-policies` lists **182
  projects with policies**, of which 98 answer "No" to whether AI or LLMs are allowed and 82 answer "Yes" or "Yes\*" —
  roughly half prohibiting. The list's own maintainers call the classification "inadequate" and "only a general guide".

The gap is a sampling artifact: one frame takes whatever the most popular repositories happen to say, the other collects
policies people thought worth submitting, and bans are more newsworthy than permissions. Neither base rate predicts the
repository in front of you. That is the argument for reading its policy rather than estimating it.

For scale: AIDev catalogs over 930,000 agentic pull requests, and the count of AI-authored PRs on GitHub approaches one
million.

## The burden that produced the rules

curl ended its bug-bounty program on 31 January 2026 after a lifetime of "87 confirmed vulnerabilities and over 100,000
USD" paid. The maintainer's stated reason: the confirmed-vulnerability rate ran "north of 15%" in earlier years and
"plummeted to below 5%" starting 2025 — "Not even one in twenty was real." Reporting moved off the bounty platform "to
remove the incentives for submitting made up lies", and the project stated it would "immediately ban and publicly
ridicule everyone who submits AI slop." (`https://daniel.haxx.se/blog/2026/01/26/the-end-of-the-curl-bug-bounty/`)

**That is a snapshot, and the same maintainer revised it.** By April 2026, after reporting returned to HackerOne, he
wrote "The slop situation is not a problem anymore." Report frequency roughly doubled against 2025, and the
confirmed-vulnerability rate returned "to and even surpassing the 2024 pre-AI level, meaning somewhere in the 15-16%
range" — while "Almost every security report now uses AI to various degrees... they are mostly very high quality."
(`https://daniel.haxx.se/blog/2026/04/22/high-quality-chaos/`)

Two consequences for this skill. **Machine authorship does not predict contribution quality**, since one intake channel
produced a slop crisis and then near-universal AI assistance at its best rate in years; what changed was the incentive
and the review path, not the tool. And **a project's routing and stance are dated facts** — curl moved four times inside
a year, so any remembered claim about where a project takes reports, or what it thinks of AI, is a guess. Nothing here
licenses a low-effort contribution: the reports that improved were the reviewed ones.

Rust's policy post supplies the review-bandwidth half of the same picture: 1,281 PRs open against `rust-lang/rust` at
the time of writing, with the observation that most review work is "deciding whether this direction is a good approach",
not catching bugs — so making code cheaper to write makes the bottleneck worse rather than better.
