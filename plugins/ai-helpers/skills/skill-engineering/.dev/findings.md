# Research findings: skill engineering

Source inventory and raw fetches: `reference-inventory.json`, `reference/`. Every number below carries its source and
date. Window rule: field claims from 2026-07-15 or later; specification and vendor reference pages admitted as `[SPEC]`
at any date because their current revision documents present behavior.

Scope note: this skill teaches how to author a skill well. The "does a skill help at all" evidence below is calibration
for the evaluation and maintenance rules — it is not the artifact's opening premise and must not become a gate the
reader passes before learning to write.

## What predicts whether a skill pays off

**A skill is a hypothesis about a (skill, project, model) triple, not a portable asset.** Injecting a topically matched
skill into a coding agent lowered mean Pass@2 by 1.3–4.2pp across four models, raised token cost by 72–394%, and
produced gains in only 17–36% of skill-project pairs (WebDev-Skills-Bench, 31 public skills, 50 projects, 1,000 ordered
tasks, arXiv 2608.23067, 2026-08-24). Per-pair effects are near-uncorrelated across models (|r| ≤ 0.12), so a single
cross-model ranking has little value.

Enterprise data points the other way: mean composite Skill Lift 0.2134 across 947 paired cases from 58 production skills
and four harnesses, positive in 72.8% of cases (ACES, arXiv 2608.20614, 2026-08-20). The two are not directly comparable
— different domains, harnesses, and grading — but together they set the stance: **a skill has to earn its injection, and
only a paired with/without measurement settles it.**

The corollary that contradicts common practice: degradation concentrates on **easy early tasks**, where the model
already holds a strong prior. The paper's own heuristic is to skip the skill on early tasks and inject once error rates
rise — the opposite of attaching skills at session start (2608.23067 §5).

**The spread reconciles on three axes**, which turn the contradiction into an authoring rule:

- **Coverage.** SkillCorpus bins tasks by retrieval-match score — how densely the corpus covers the task. Mean effect
  climbs from **+2.2pp in the lowest bin to +25.1pp in the highest**. A skill matched to a task it actually covers is a
  different object from one that is merely on-topic.
- **Baseline weakness.** Gains concentrate where the model is weak: the low-baseline Industrial & Physical category
  gains **+45.5pp**, while webdev — where the model has a strong prior — loses. On SWE-Skills-Bench, **39 of 49 skills
  yield zero pass-rate improvement**.
- **Competition.** ACES's +0.2134 lift and 72.8% positive rate are measured in **Isolation Mode** — one skill, no
  competing siblings, no routing pressure. The 29.6% → 3.3% precision collapse is what the same skills meet in a real
  library. The two numbers do not contradict; they measure different deployments.

Read together: **a skill pays off when it covers a task the model is bad at, and it costs when it decorates a task the
model already handles.** That is a scoping rule for the author, not a philosophical gate.

**Utility does not transfer across models.** Per-pair effects are near-uncorrelated (Pearson −0.08 to +0.12, mean ≈
0.00); **74% of pairs carry at least one positive and one negative model sign**, only 1% gain on all four and 4% lose on
all four. One skill's content moved Sonnet 4 **+33pp** while DeepSeek and Qwen each lost 22pp.

## The mechanism: skills anchor procedure, they do not teach facts

Across 8,135 controlled trial records, 65.7% of measured skill benefit was attributed to **procedural anchoring** —
stabilizing setup steps, tool sequences, intermediate checks, and recovery from recurring failures — versus 4.5%
attributed to explicit knowledge injection. Matched skills beat Workflow Memory by 6.06pp overall (Demystifying Agent
Skills, arXiv 2608.14036, 2026-08-14).

The same study measures the cost of loading one: `skill_guidance_misapplied_or_ignored` appears in **10.0%** of
skill-arm cases, against 0.8% for raw execution and 0.4% for Workflow Memory. **Availability of a skill is itself a new
failure surface** — the agent now has an applicability judgment to get wrong that it did not have before.

Token accounting from the same paper, over 83 matched tasks: against raw trajectories, skills improved success +5.5pp
while using **34.2K fewer** total tokens per task; against Workflow Memory, +4.8pp for **95.3K more** tokens per task.
Skill cost is not a constant — it depends entirely on what it replaces.

## Selection degrades with library size

As the candidate pool grew from 5 to 100 skills, actual-use precision fell from **29.6% to 3.3%**, while downstream
success moved only 36.4% → 39.3%. Agents inspected several plausible candidates rather than selecting the ground-truth
one (2608.14036). Recall stayed at 54.3–73.6% in one arm while precision was 0.7–8.1%.

"Write more skills" is not a free scaling strategy, and the remedy is discrimination, not more trigger synonyms: a
description must separate its skill from its **neighbors**, not merely describe its own contents truthfully.

## Portability is now a package standard, and it is thinner than it looks

**Agent Plugins 1.0.0, published 2026-08-06** (agentplugins/agent-plugins-spec, AAIF). A versioned `plugin.json` with
`$schema` plus `name` as the required minimum, fixed component locations, portable path variables, validation and
failure isolation, and client-specific extension namespaces. Skills and MCP configuration are the portable core. GitHub,
AWS, OpenAI, Cursor, Microsoft, Vercel, and Google participated in the launch. GitHub shipped support across VS Code,
Copilot CLI, and the Copilot app on 2026-08-12.

What it deliberately does **not** standardize: agents, commands, hooks, rules, UI extensions, permissions, sandboxing,
marketplace governance, and invocation semantics. So the file contract converged further than the behavior around it.

Consumers in the window: Claude Code (native, superset frontmatter) · ChatGPT and Codex (open standard; Skills author,
Plugins distribute) · GitHub Copilot code review, GA 2026-07-29, `.github/skills/<skill>/SKILL.md`, MCP calls read-only
· Cursor CLI, 2026-08-11, sticky skills and nested-resource materialization · Google Antigravity, `.agents/skills`,
three-tier disclosure · OpenClaw and Raven.

**Format compatibility is not utilization equivalence.** SkillCorpus fed identical precomputed skill selections to two
harnesses: Raven gained +13.4pp on SkillsBench, OpenClaw +5.8pp. Trace inspection suggested OpenClaw reasoned about
bundled scripts without executing and verifying them, while Raven completed the execute-verify-fix loop (arXiv
2607.15557 v5, 2026-08-06). A skill that depends on script execution is a different artifact on a harness that only
reads.

## What content actually carries the value

Leave-one-out slice ablation on the helpful tail (five skill-project pairs with robust positive effect; the complete
skill raised Pass@2 by +5.1pp there, +6.1pp excluding Sonnet). Pooled over 20 model × project cells:

- **Anti-pattern rules** — +3.1pp, the only slice with a directionally reliable task-level effect (Wilcoxon p = 0.008;
  McNemar discordants b = 111, c = 74)
- **Positive rules** — +0.0pp, neutral
- **Example code** — −0.7pp pooled, and the costliest slice: removing it saves 34,482 input tokens per run, 22.7% of the
  full SKILL.md budget

**The pooled example figure is a cancellation artifact, and the split is the finding.** Per model: DeepSeek +8.3pp, Qwen
+3.7pp, GPT-5.1 +0.7pp, **Sonnet −15.3pp**. Excluding Sonnet, every slice turns positive and examples become the
strongest and most significant of all (+4.2pp, Wilcoxon p = 0.005). For the strongest model in the panel, in-skill
examples act as a constraint that suppresses its own better priors — the **retry lock-in** mechanism: after a minor
first-attempt mistake, the skill's prescriptive conventions restrict the recovery path that the baseline would have
found.

Two consequences, and they point opposite ways depending on the target:

- **Writing for a frontier Claude model**: examples are the single most damaging slice measured, and the cheapest to
  remove. Anti-pattern rules carry the value.
- **Writing for a weaker or open model**: examples are the strongest slice. A skill tuned for one is mistuned for the
  other.

This converges with the prompt-engineering finding that examples specify rather than illustrate, and again with
Anthropic's own "gotchas" rule: the highest-signal content is the list of environment-specific facts that defy
reasonable assumptions (claude.com/blog, 2026-06-03; agentskills.io best-practices `[SPEC]`).

**Prescription costs recoverability.** Retry lock-in is the general form: every prescriptive instruction narrows the
recovery space the model would otherwise search. Degradation therefore concentrates where the model was already going to
succeed — easy-task loss runs −4.0pp (GPT-5.1) to −10.7pp (Qwen), each CI excluding zero.

## How skills fail once loaded

307 attributed cases across SkillsBench and SWE-Skills-Bench — 125 functional failures, 182 efficiency regressions
(arXiv 2608.11888, 2026-08-12).

Functional failures:

- **Task-Implementation Fault — 86 cases (68.8%)**, split into incorrect required-element fill (46) and required-element
  omission (36). The skill steers the agent to build the right thing the wrong way, or to leave a required element out.
- **Artifact Misplacement — 24 (19.2%)**: right artifact, wrong path or integration point.
- **Environment Mismatch — 13 (10.4%)**: broken dependency or runtime (5), environment-state mismatch (8).
- **Applicability Mismatch — 2 (1.6%)**.

The headline: functional failures are **rarely caused by obviously irrelevant skills**. Topically relevant skills
distort task-required elements. Routing precision does not protect against this.

Efficiency regressions (threshold: more than double token use or time, with the other metric also rising):

- **Excessive Procedure — 114 (62.6%)**: excessive verification 67 (36.8%), heavy implementation pipeline 30 (16.5%),
  excessive exploration 17 (9.3%)
- **Context Bloat — 46 (25.3%)**: skill-body bloat 43, supplementary-material bloat 3
- **Dependency Resolution — 22 (12.1%)**

**Excessive verification is the single largest regression category.** Skills turn optional validation checklists into
mandatory work on every task. Prompt length alone does not explain the cost.

## Ecosystem quality and the defect taxonomy

138,133 public SKILL.md files from 20,556 repositories (arXiv 2608.08453, 2026-08-09):

- 91.8% carry at least one detected defect; 89.3% violate at least one spec-derived check. Mean 2.5 defects, median 2.
- Three most prevalent: **missing trigger guidance (52.3%)**, **name repeated as H1 heading (44.3%)**, **too many inline
  examples (32.1%)**.
- 67.0% have at least one routing defect; with non-functional descriptions (13.5%), over half of all public skills have
  descriptions that cannot route.
- Routing stress test over 20,000 skills: clean routing metadata retrieved at 88.5% hit@1 / 0.906 MRR versus 82.6% /
  0.855 for defective. The effect is real but modest — routing defects cost roughly 6pp of discovery, while the
  loaded-skill failures above cost far more.
- Defect density rises with size (Spearman ρ = 0.508): skills over 500 lines average 4.76 defects, skills under 50 lines
  average 1.48.
- Spec-aware skills average 1.83 defects versus 3.00 for spec-unaware (Cliff's δ = −0.40).
- Skills carrying an AI-generation marker average 3.23 defects versus 2.34 (+38%); the gap is sharpest in behavioral
  safety (18.9% vs 8.2%) and portability (12.8% vs 4.6%). The authors flag this as association, not causation.

Their twelve authoring guidelines, ordered by share of skills affected: G1 trigger-complete description ≥30 chars,
"[Verb] [what]. Use when [trigger]." (52.3%) · G4 no name-as-H1 (44.3%) · G7 externalize code >60% and >8 example blocks
(37.0%) · G8 no install instructions, changelogs, licenses, TODOs (16.8%) · G3 description under 250 chars, use case
front-loaded (14.3%) · G6 body under 500 lines (10.4%) · G12 no persona redefinition or instruction override (6.8%) · G9
no credentials, user paths, `--no-verify` (5.8%) · G11 no hardcoded models, platform paths, OS commands (5.8%) · G2
routing info in the description, not the body (5.2%) · G10 confirmation for destructive actions (4.7%) · G5 imperative
directives, not explanatory prose (3.2%).

Exemplar analysis (419 zero-defect skills from repos with ≥10k stars) found two viable shapes and one non-tautological
trait. Shapes: **minimal-and-precise** (React's verify skill, 24 lines, imperative commands plus common mistakes) and
**structured-workflow** (Discourse's service-authoring skill, 220 lines, eight phases with gate conditions, every line
actionable). The trait: exemplars encode **local procedural knowledge** — repository, framework, or service specific —
rather than tutorial content the model could generate on demand.

## Security: the skill channel is a supply chain

This is where the window is densest.

- **A live campaign.** Zenity reported a credential-stealing typosquat family distributed through Vercel's `skills.sh`
  with more than **1.7 million aggregate installs** before discovery (2026-08-06). Aggregate installs, not unique users,
  and the reach of one family — not a prevalence rate.
- **Static analysis has measured blind spots.** SkillsMetric (arXiv 2608.08468, 2026-08-09) reaches AUC 0.93 and 5-fold
  F1 73.4% ± 0.5% over 2,266 labeled skills, with ~93% detection for exfiltration and steganography — but **0% for host
  destruction via ordinary shell commands** and **42% for natural-language prompt injection**. Its full-population scan
  flagged 1.75% of 138,133 skills; the authors call that a lower bound, because it reads `SKILL.md` only and never
  fetches companion scripts.
- **Per-skill scanning is the wrong unit.** ColluSkill (arXiv 2608.09732, 2026-08-10) splits malicious behavior across
  several individually plausible skills and reaches **96.0% average attack success against six scanners**. Its
  chain-aware defense, which analyzes a candidate together with already-installed skills, cuts that to 22.5% while
  passing 99.5% of benign workflows.
- **Cost is an attack surface.** SkillBloat (arXiv 2608.21929, 2026-08-22) reports **5.4×–10.1× token amplification**
  against coding-agent configurations. Token budget is a security budget.
- **Layered review has measured economics.** Static pre-screen runs at >100 skills/sec, semantic LLM review at ~1
  skill/sec; routing only the ~2% ambiguous cases to the LLM gives roughly 50× cost reduction over LLM-only review
  (2608.08468).

The authoring consequences: never ship credentials, user paths, or `--no-verify`; gate destructive actions behind
confirmation; keep companion scripts reviewable; and treat an installed third-party skill as trusted only in combination
with everything else installed, not in isolation.

## Evaluation, which is now a solved-enough problem

Two things must be measured separately, and both need a with/without baseline in a fresh session (code.claude.com skills
`[SPEC]`):

1. **Does it trigger** on the prompts it should, and stay quiet on near-misses.
2. **Does the output change** when it does.

Description tuning protocol (agentskills.io optimizing-descriptions `[SPEC]`): ~20 labeled queries, 8–10 should-trigger
and 8–10 should-not-trigger; near-misses are the valuable negatives; 3 runs each, trigger rate threshold 0.5; 60/40
train-validation split to prevent overfitting; select by validation pass rate, which is often not the last iteration;
five iterations is usually enough. Do not add keywords lifted from a failed query — generalize the category instead.

Output-quality protocol: `skill-creator` (`/plugin install skill-creator@claude-plugins-official`) stores cases in
`evals/evals.json`, spawns a subagent per case for clean context, writes `grading.json`, `timing.json`, and
`benchmark.json` with with-skill versus without-skill pass rate, tokens, and duration, runs blind A/B between two
versions, and generates should-trigger/should-not-trigger sets for description tuning.

**A quality score does not predict whether the skill works.** On 145 skills, the deterministic structural score and the
LLM-judge score correlate at Spearman ρ = 0.14 (Pearson r = 0.08) — and both pass most skills individually (94.5% and
86.2% at threshold 70), so the near-zero correlation is not one scale being degenerate. Against **live Skill Lift** on
62 skills, structural score reaches Spearman **ρ = −0.018** (95% CI [−0.267, 0.233]) and the LLM-judge score **ρ =
−0.027** (95% CI [−0.275, 0.225]). Both are statistically indistinguishable from zero (ACES, 2608.20614).

Linting catches defects. It says nothing about value. Only a paired run does.

**A skill decays without being edited.** As the backend model improves, the baseline rises and measured Skill Lift
shrinks even when absolute task performance stays high — the model no longer needs the procedure. The maintenance
trigger is therefore a model or harness upgrade, not a calendar interval, and the regression matrix has four dimensions:
task, skill version, harness version, model.

### `claude plugin eval` — the non-interactive harness

Undocumented in the public docs and absent from every search result, but shipping in the CLI. Verified against the
installed binary on 2026-08-28 by reading `claude plugin eval --help`. This is the CI-capable path that the documented
`skill-creator` loop is not.

- **Target** — a path, a plugin name, or `plugin@marketplace`. Installed plugins and skills-dir plugins both resolve.
- **Cases** — `<eval dir>/**/case.yaml`, or `prompt.md` plus `graders/*.md`. Default eval dir is `evals/`, overridden by
  `--eval-dir` or the manifest's `experimental.evals`.
- **Ablation** — `--ablation with-without` runs a no-plugin baseline arm and reports the score delta. It is the default
  whenever a plugin resolves. Under it, graders marked `with-only` — including `tool_used: Skill` — are a plugin-fired
  indicator rather than part of the score. **The activation test and the behavior test are separate arms of one run.**
- **Repetition** — `--runs <n>`, default `case.runs ?? 3`, matching the trigger-rate protocol.
- **Gate** — `--threshold <0..1>` exits 1 when any case scores below it, default 1.0. `--max-cost-usd` aborts with
  exit 2.
- **Grading** — LLM graders default to Haiku, overridable with `--judge-model`; `--model` overrides the model under
  test.
- **Output** — `--json [path]` for the full run result, `--report <path>` for a self-contained HTML report,
  `--output-dir`. The report publishes to claude.ai by default; `--no-publish` keeps it local.
- **Authoring** — `claude plugin eval init [name]` runs an interview that sources inputs and designs graders;
  `--bare <name>` writes `prompt.md` plus `graders/criteria.md`.
- **Filters** — `--case <glob>`, `--tag <tag...>`.
- **Isolation** — `--mocks record|off` stands in for MCP servers; `--allow-tools` is the operator grant for gated tools;
  `--scaffold` runs author-supplied bash and is off by default.

Two companion commands:

- `claude plugin validate <path> [--strict]` — validates a plugin or marketplace manifest, or the skills, agents, and
  commands in a directory. `--strict` fails CI on unrecognized fields and missing metadata that the runtime tolerates.
  Finds SKILL.md files whose frontmatter does not parse (Claude Code v2.1.233+); malformed frontmatter loads the body
  with empty metadata, so `/name` still works and the skill never auto-triggers.
- `claude plugin details <name>` — component inventory and **projected token cost**. This is the instrument for the
  budget rule; nothing else reports a skill's cost before it is invoked.

`/skill-doctor` is named by first-party tooling available in this session but appears in no public doc and is not a CLI
subcommand. Treat it as unverified until seen running.

## Claude Code specifics

**Frontmatter beyond the spec.** The spec allows six fields: `name`, `description`, `license`, `compatibility`,
`metadata`, `allowed-tools`. Claude Code accepts those plus `when_to_use`, `argument-hint`, `arguments`,
`disable-model-invocation`, `user-invocable`, `disallowed-tools`, `model`, `effort`, `context`, `agent`, `background`,
`hooks`, `paths`, `shell`. Any non-spec field is a **hard error** on claude.ai upload, the Skills API, and
`package_skill.py` — not a warning: `Unexpected key(s) in SKILL.md frontmatter: argument-hint`. Portability across
distribution paths is a design decision made at authoring time.

**The description is budgeted, not just capped.** Spec cap is 1,024 characters. Claude Code caps the combined
`description` + `when_to_use` at 1,536 characters in the listing (`skillListingMaxDescChars`), and the whole listing at
1% of the model's context window (`skillListingBudgetFraction`). On overflow, Claude Code **drops descriptions starting
with the skills you invoke least**. A rarely-used skill in a crowded install loses its routing text entirely. `/doctor`
estimates the listing cost and names the biggest contributors.

**Loaded content persists and is never re-read.** Rendered SKILL.md enters the conversation as one message and stays
across turns; Claude Code does not re-read the file. Write standing instructions, not one-time steps. Re-invoking with
identical rendered content adds a note rather than a second copy; changed arguments or changed dynamic-context output
append the full content again.

**Compaction truncates skills.** After auto-compaction, Claude Code re-attaches the most recent invocation of each
skill, keeping the **first 5,000 tokens** of each, under a **combined 25,000-token budget** filled from the most
recently invoked. Older skills can be dropped entirely. Two consequences: the first 5,000 tokens are the durable part of
any long skill, and a skill that must survive compaction has to be re-invoked.

**Invocation control is a three-way matrix.** Default: both parties invoke, description always in context.
`disable-model-invocation: true`: user only, **description not in context** — this is the lever for a heavy skill whose
routing text would otherwise tax every session. `user-invocable: false`: model only, description always in context.
`skillOverrides` in settings sets `on` / `name-only` / `user-invocable-only` / `off` per skill without editing the file;
plugin skills are exempt.

**Permissions are per-turn.** `allowed-tools` grants during the invoking turn only and clears on the next user message;
it does not restrict anything. `disallowed-tools` removes tools for the same window. Workspace trust does not gate
`allowed-tools`, so a project skill in an untrusted repo can grant itself broad access — review before running Claude
Code in a cloned repo.

**Execution surfaces.** `` !`cmd` `` runs before content reaches the model; a failed command **aborts the whole
invocation**, and the model never sees the skill. Non-zero exit fails except a carveout for search and comparison
commands at exit 1; append `|| true` otherwise. Injected commands never prompt — a permission check that would ask
aborts instead. `disableSkillShellExecution: true` neutralizes this class for user, project, plugin, and
additional-directory skills.

**Substitutions.** `${CLAUDE_SKILL_DIR}`, `${CLAUDE_PROJECT_DIR}`, `${CLAUDE_PLUGIN_ROOT}`, `${CLAUDE_PLUGIN_DATA}`,
`${CLAUDE_SESSION_ID}`, `${CLAUDE_EFFORT}`, plus `$ARGUMENTS`, `$ARGUMENTS[N]`, `$N`, and named `$name` from the
`arguments` list. `${CLAUDE_SKILL_DIR}` and `${CLAUDE_PROJECT_DIR}` substitute in both the body and Bash rules inside
`allowed-tools` — the pattern that lets a bundled script run without a prompt. `${CLAUDE_PLUGIN_DATA}` is the stable
directory for skill-owned state that survives plugin updates.

**Forked execution.** `context: fork` turns the skill body into a subagent prompt with no conversation history; `agent:`
picks the type, `background: false` waits in-turn. A backgrounded fork gets the narrower background-subagent tool set
and its edits fall outside `/rewind` checkpoints. A reference-content skill under `context: fork` returns nothing useful
— the subagent receives guidelines and no task.

**Command names and precedence.** Personal and project skills take the command from the directory name; `name` is only a
display label. Plugin skills take the last command segment from `name`, namespaced by plugin. Name collisions resolve
**enterprise > personal > project**, and any of those overrides a bundled skill of the same name. A skill beats a
`.claude/commands/` file with the same command name. A nested project skill becomes directory-qualified —
`/apps/web:deploy` alongside the root `/deploy` — rather than shadowing it. Synced claude.ai skills lose to every local
source, and their name comparison ignores case, spacing, invisible characters, fullwidth forms, and dash variants.

**Version gates that make older guidance wrong.** `background` on a forked skill needs v2.1.218+, which is also where
boolean parsing widened past `true`/`false`. `${CLAUDE_PROJECT_DIR}` needs v2.1.196+. `claude plugin validate` needs
v2.1.233+. Plugin skill names already carrying their own prefix were double-namespaced from v2.1.216 through v2.1.245
and fixed in v2.1.246, which is also where `/cd` began discovering project skills in the new directory. The August
release stream fixed skills with a byte-order mark being silently ignored — a validator must test the exact bytes, not
the parsed Markdown.

**Live reload is partial.** SKILL.md text under watched personal, project, and additional-directory paths updates during
the session. Plugin `hooks/`, `.mcp.json`, `agents/`, and `output-styles/` need `/reload-plugins`. "Restart after every
skill edit" is too broad; "edits always take effect" is too narrow.

**Two reported harness bugs to design around.** A `context: fork` skill can dispatch to a background agent with no task
payload and silently do nothing, surfacing no error (claude-code#82240, 2026-07-29). A skill invoking another skill that
carries `disable-model-invocation` fails with
`Skill <name> cannot be used with Skill tool due to disable-model-invocation` even though typing `/<name>` works
(claude-code#79560, 2026-07-20) — skill-to-skill composition is not a supported path across that flag.

## Contested and unresolved

- **Does a skill help at all?** 17–36% of pairs gain (webdev benchmark, 2608.23067) versus 72.8% positive (enterprise
  ACES, 2608.20614) versus +7.5 ± 2.3pp pooled peak (SkillCorpus, 2607.15557). Domains, harnesses, and graders differ.
  No source reconciles them, and the spread is the single most important open question for this artifact.
- **Imperative register.** The 138K exemplars are imperative throughout, but the authors state the property is partly
  definitional — their detector selects for it. The controlled evidence supports **procedural anchoring**, not
  imperative grammar as such. Anthropic's platform docs additionally require third person in the description while
  agentskills.io recommends "Use this skill when…"; both are satisfiable at once.
- **The 500-line ceiling** is repeated by every vendor page and is the basis of G6, yet defect density rises
  continuously with size (ρ = 0.508) rather than stepping at 500. The line count is a proxy, not a threshold.
- **Line count versus token count.** The spec recommends under 500 lines _and_ under 5,000 tokens; Claude Code's
  compaction budget is 5,000 tokens per skill. These agree only at a particular line density.
- **Static score versus task success.** The 91.8% defect figure is ecosystem hygiene, not failure rate. Only routing was
  functionally stress-tested; long narrative skills can be labelled defective by best-practice detectors. Do not restate
  it as "91.8% of skills fail."
- **Description length.** Portable cap 1,024 characters; Claude Code's listing truncates description + `when_to_use` at
  1,536. Neither is evidence that a longer description routes better, and no controlled length ablation exists.
- **Skill versus MCP.** Standards separate procedure from server-mediated capability and package both, but no benchmark
  says when to convert one into the other, or what choosing wrong costs.

## Gaps in the window

No in-window source measures: how often a bundled reference is actually read, or what wording drives it; how many
independent instructions one skill can carry before adherence degrades; a production base rate for missed activation; a
deterministic precedence when a skill contradicts CLAUDE.md, a hook, an output style, or an MCP prompt; the reliability
delta between the same algorithm as prose and as a bundled script; skill staleness or half-life after a model upgrade;
team governance practice — ownership, reviewers, retirement.
