# Evaluating a skill

A skill that loads is not a skill that works. Two questions need separate answers, and neither is answered by reading
the file.

1. **Activation** — does it fire on the prompts it should, and stay quiet on the ones a sibling skill owns?
2. **Behavior** — does the output change in the intended direction when it does fire?

Both need the same control: **a no-skill baseline, run in a fresh session.** A fresh session matters because context
left over from authoring the skill masks the gaps in what the file actually says.

## A quality score does not predict value

Measured on the same skill sets: the deterministic structural score and an LLM-judge score correlate with each other at
Spearman ρ = 0.14, and each passes most skills individually — so the disagreement is real, not one scale being broken.
Against **live skill lift**, structural score reaches ρ = −0.018 and the LLM-judge score ρ = −0.027. Both are
statistically indistinguishable from zero.

Linting finds defects. It says nothing about whether the skill helps. Run both gates and do not let either stand in for
the other.

## Testing activation

Build a labeled query set: roughly 20 prompts, 8–10 that should trigger and 8–10 that should not.

**Should-trigger prompts** vary along four axes — phrasing (formal, casual, typos), explicitness (some name the domain,
some only describe the need), detail (terse and context-heavy), and complexity (single-step and multi-step). The useful
ones are where the skill would help but the connection is not obvious from the prompt; if the prompt already asks for
exactly what the skill does, any description passes.

**Should-not-trigger prompts must be near-misses.** "Write a fibonacci function" tests nothing. A prompt that shares
vocabulary but needs a different capability — one owned by a neighboring skill — is what actually measures precision.

**Run each prompt several times** and compute a trigger rate; model behavior is not deterministic. Three runs is a
reasonable start, with 0.5 as the pass threshold in both directions.

**Split the set 60/40 into train and validation.** Optimize the description against the train half only, and select the
best iteration by _validation_ pass rate — which is often not the last iteration produced. Stop at five iterations; if
nothing improves, suspect the queries rather than the description.

When a should-trigger prompt fails, do not paste its keywords into the description. That is overfitting. Find the
category the prompt represents and address that.

Detection is host-specific: the skill triggered if the host loaded `SKILL.md`. In Claude Code, a headless run with JSON
output exposes the `Skill` tool call, which is the signal to count.

### Description work has a ceiling

Autonomous activation is unreliable in a way description tuning cannot fix. Measured across 200-plus sandboxed runs on
four skills and five prompt categories, on Haiku 4.5:

- **No hook, or a simple instruction hook** — around 20%, with a baseline that varies by model and prompt specificity up
  to roughly 55%. A hook that merely suggests using the skill performs no better than no hook.
- **A native prompt-type hook** — same as no hook; it gets deprioritized.
- **An LLM pre-screening hook** — around 80% overall: near-perfect on single-skill prompts, and it collapsed to 0% on
  multi-skill prompts in that testing.
- **A forced-evaluation hook** — around 84% overall, and the most consistent across prompt categories.
- **Manual invocation by name** — 100%.

The forced-evaluation result comes from a **commitment mechanism**, not from stronger wording: the model must evaluate
each available skill, state yes or no with a reason, and only then proceed. Once it has written "yes — this applies", it
is committed. Passive suggestions are read as background noise and skipped.

Description quality still matters below that ceiling: a clear trigger pattern with specific terms and file types reaches
roughly 50%, and naming the skill from a project instruction file or workflow documentation reaches roughly 60-70%.
Beyond that, only a hook moves the number. Design a skill to be useful when loaded rather than to depend on perfect
autonomous activation.

Treat these figures as a direction rather than a constant — they are one model and one skill set, and the sample is a
community measurement rather than a controlled ablation. The ordering has held up; the absolute values should be
re-measured on the model actually in use.

> The source of these measurements also reports that aggressive wording in the hook prompt reinforces compliance. That
> part is not carried over: emphasis scaffolding costs budget without earning it, and the commitment structure is what
> the evidence attributes the gain to.

## Testing behavior

A test case has three parts: a realistic prompt, a human-readable description of success, and any input files. The
documented store is `evals/evals.json` in the skill directory:

```json
{
	"skill_name": "csv-analyzer",
	"evals": [
		{
			"id": 1,
			"prompt": "I have a CSV of monthly sales in data/sales_2025.csv. Find the top 3 months by revenue and make a bar chart.",
			"expected_output": "A bar chart showing the top 3 months by revenue, with labeled axes and values.",
			"files": ["evals/files/sales_2025.csv"],
			"assertions": [
				"The output includes a bar chart image file",
				"The chart shows exactly 3 months",
				"Both axes are labeled"
			]
		}
	]
}
```

- **Start with two or three cases.** Expand after the first round of results, not before.
- **Add assertions after the first outputs exist**, not while designing. What good looks like is rarely clear until the
  skill has run.
- **A good assertion is verifiable, specific, and countable** — "the output file is valid JSON", "the report includes at
  least 3 recommendations". A weak one is vague ("the output is good") or brittle ("uses exactly the phrase 'Total
  Revenue: $X'"), where correct output with different wording fails.
- **Not everything needs an assertion.** Style, visual design, and whether the result feels right resist pass/fail
  decomposition; leave those to human review.
- **Grade with evidence, not opinion** — record PASS or FAIL per assertion and quote the output that justifies it. Use a
  script for anything mechanical (valid JSON, row counts, file existence); scripts beat LLM judgment on those and are
  reusable across iterations.

## Iterating

Three signals, and the third is the one authors skip:

- **Failed assertions** point at a specific gap — a missing step, an ambiguous instruction, an unhandled case.
- **Human feedback** points at broader quality — wrong approach, poorly structured output, technically correct and
  unhelpful.
- **Execution transcripts** show _why_. Treat an ignored instruction as ambiguous before treating it as disobeyed, and
  time spent on unproductive steps as instructions to simplify or delete.

Rules for turning signals into edits:

- **Generalize.** The skill runs on prompts outside the test set. Fix the underlying issue rather than patching the
  example.
- **Suspect over-constraint when pass rates plateau.** If adding rules stops helping, remove rules and check whether
  results hold. Fewer, better instructions routinely beat exhaustive ones.
- **Explain the why.** "Do X because Y causes Z" outperforms "ALWAYS do X, NEVER do Y".
- **Bundle repeated work.** If every run independently reinvents the same helper, that is the signal to write it once
  into `scripts/`.
- **Cut instructions that transcripts show causing wasted work** — unnecessary validation, unneeded intermediate
  outputs. Mandatory verification is the largest measured source of cost regression.

Stop when feedback is consistently empty or iterations stop producing meaningful change.

## Measure in the deployment, not in isolation

The most favorable published numbers for skills come from isolation runs — one skill, no competing siblings, no routing
pressure. In a realistic library the selection problem dominates: as the candidate pool grew from 5 to 100, actual-use
precision fell from 29.6% to 3.3%, with agents inspecting several plausible candidates rather than the intended one.

So evaluate the description with its neighbors present. A trigger set that never offers the model a competing skill
measures a deployment nobody runs.

## Check for interference before shipping

A skill adds rules to a set that already exists. Rule accumulation produces predictable conflicts: the same constraint
restated in several places with different wording, a mandate that contradicts a prohibition elsewhere, and parallel
guidance that coexists with a sequential constraint. Each rule is correct alone; together they conflict.

**The executing model is the worst validator of this.** It resolves contradictions with judgment, and resolving them is
exactly what prevents it from reporting them. Silence is not evidence of consistency.

- **Check the new rule against the host's own directives**, and against the other skills and instruction files that load
  alongside it.
- **Check whether the constraint is already stated elsewhere** in different words. If it is, consolidate or delete one.
- **Check that the resolution order is explicit** wherever two rules can both apply.
- **Test in a fresh context, or with a different model than the one that will execute**, so the validator is not the
  party doing the smoothing.

## Regression: four dimensions, not one

Version the evaluation across **task, skill version, host version, and model**. Two findings force this:

- **Utility does not transfer across models.** Per-pair effects are near-uncorrelated (Pearson −0.08 to +0.12); 74% of
  pairs carry at least one positive and one negative model sign. One skill's content moved the strongest model +33pp
  while two others each lost 22pp.
- **A skill decays without being edited.** As the backend model improves, the baseline rises and measured lift shrinks
  even when absolute performance stays high — the model no longer needs the procedure. The maintenance trigger is a
  model or host upgrade, not a calendar interval.

## Tooling

- **`claude plugin validate <path>`** — validates a plugin or marketplace manifest, or the skills, agents, and commands
  in a directory. `--strict` fails on warnings the runtime tolerates, which is the CI setting. Structural gate only.
- **`skill-creator`** (`/plugin install skill-creator@claude-plugins-official`) — automates the loop: stores cases,
  spawns a subagent per case for clean context, grades assertions with evidence, aggregates with-skill against
  without-skill pass rate, runs a blind A/B between two skill versions, and generates should-trigger and
  should-not-trigger prompts for description tuning.
- **`claude plugin eval`** — a non-interactive harness with a with-without ablation arm exists in the CLI but is gated
  behind early access, so it may report `plugin eval is currently in early access` instead of running.

Before reaching for a custom harness, exhaust these. A hand-rolled probe duplicates them and has to be maintained.
