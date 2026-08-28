---
name: subagent-engineering
description: >-
  Design and maintain Claude Code subagents: the delegation decision, the frontmatter that governs a run, and the
  system prompt the agent wakes up with.
when_to_use: >-
  Invoke whenever a subagent is touched at all — writing, editing, auditing, or debugging an agent definition, or
  deciding whether work should run in an isolated context. Also invoke on the symptoms: an agent never fires, the
  wrong one fires, the result never comes back, the output arrives in a shape the caller cannot use, or a run leaves
  the tree modified. Covers the subagent artifact; the wording of its instructions belongs to prompt-engineering, the
  skill artifact to skill-engineering, and the main agent's system prompt to output-style-engineering.
compatibility: Uses Claude Code frontmatter beyond the Agent Skills spec (when_to_use)
---

**A subagent is a separate context with its own system prompt.** It inherits none of the caller's conversation, and
everything it reads is discarded when it stops — only what it returns survives. Isolation is the reason to pay for one,
and the return value is the entire product.

<prerequisite>
A subagent definition is a system prompt. Invoke `prompt-engineering` for the wording, instruction budget, and
timelessness rules that govern every line written here. This skill covers only what is specific to the subagent
artifact — the delegation decision, the frontmatter, and the prompt the agent wakes up with.
</prerequisite>

## Delegate only where the isolation pays

- **Delegate work whose output is far larger than its conclusion** — a wide search, a long file, a verbose test run. The
  caller pays for the summary instead of the transcript.
- **Delegate to restrict, too.** A tool allowlist or a cheaper model binds the whole run, which no instruction inside
  the main conversation achieves.
- **Keep the work in the main conversation when it needs back-and-forth**, when several phases share the same context,
  or when the change is small and targeted. A subagent starts cold: it pays in startup latency and in rediscovering what
  the caller already knows.
- **Write a skill instead when the artifact wanted is reusable instruction text** that runs in the caller's own context.
  A skill carries procedure; a subagent carries a context boundary.
- **A subagent runs its own system prompt; an output style modifies the main agent's.** A style appends its body to the
  session prompt and, under `keep-coding-instructions: false`, drops the `# Doing tasks` section — it never gives the
  work a context of its own.
- **Check the built-ins before writing a definition** — `Explore` for read-only search on Haiku, `Plan` for read-only
  research, and `general-purpose`, which is what an `Agent` call gets when it names no type.
- **A subagent cannot spawn a subagent.** Every fan-out is decided by the caller, so an agent that discovers more work
  reports it rather than delegating it.

## Write the description as routing code

- **Claude sees only `name` and `description` when it decides to delegate.** The body loads after that decision, so no
  line in it rescues a description that never fires.
- **State what the agent does, then when to invoke it.** A description that names only a domain gives the model nothing
  to fire on.
- **Discriminate against the neighboring agents** by naming the exclusion — "not for general code review, use
  `code-reviewer`". A concrete exclusion beats abstract precision.
- **Keep execution steps out.** The description is read to decide whether to delegate, never how to execute, and steps
  there widen the trigger while changing nothing about the run.
- **Reach for "use proactively" only where unprompted delegation is wanted.** It buys automatic routing and pays in
  precision; an agent that fires on the wrong requests costs more than one that waits to be asked.

Description tuning against observed misfires, the constraint block that stops scope creep, the efficiency and
return-length caps that stop context bloat, A/B comparison between versions, the fan-out iteration loop and the
parallel-session bias it carries, and the criteria separating a fix from a split from a rebuild:
[`${CLAUDE_SKILL_DIR}/references/iteration.md`]. Read it when a working agent fires on the wrong requests, never fires,
underperforms on part of its scope, or is being tuned across a fan-out.

## Set the fields that govern the run

- **`name` takes lowercase letters, numbers, and hyphens, caps at 64 characters, matches the filename stem, and must not
  contain "anthropic" or "claude".** `claude-code-guide` ships as a built-in, so an author copying that naming style
  writes a name the loader rejects. `description` caps at 1024 characters; neither field accepts `<` or `>`.
- **Grant the narrowest `tools` set the task needs.** An omitted `tools` field inherits everything the parent holds. The
  allowlist is the enforcement; a prose constraint in the body is not.
- **Name every skill the agent needs in `skills`.** A subagent inherits none from the parent, and the field injects the
  full skill text rather than making it invocable.
- **`permissionMode` restricts and never escalates.** A parent running `auto` makes the field inert, and a parent's
  `bypassPermissions` is inherited and cannot be revoked from the definition.
- **Match `model` to the work, not to the caller.** `inherit` is the default, so a cheap high-volume agent pays the
  caller's price until the field says otherwise. A per-invocation `model` and `CLAUDE_CODE_SUBAGENT_MODEL` both outrank
  it.
- **The `Agent` tool's `name` parameter makes the spawn a teammate while agent teams are enabled**, and a teammate's
  idle notification carries no output. Spawn without a name when the caller needs the result back.
- **`hooks`, `mcpServers`, and `permissionMode` are ignored without warning in a plugin-bundled agent.** Copy the file
  into `.claude/agents/` to use them.

The full field list, the `Agent` tool parameters, permission-mode semantics, storage and scope priority, the hooks
schema, and the SDK `settingSources` requirement: [`${CLAUDE_SKILL_DIR}/references/spec.md`]. Read it when setting a
field this section does not cover, or when deciding where the definition file lives.

## Write the prompt the agent wakes up with

- **The body is the whole system prompt.** The agent receives it plus basic environment details and nothing else — no
  conversation history, no caller reasoning. Whatever the task depends on is restated here or passed at invocation.
- **Say who fans out.** An agent able to read its own scope will widen it: "the caller fans out, this agent does not —
  audit what the prompt assigned, never re-derive the scope."
- **Specify the output format and name the verdict vocabulary.** The caller acts on the return mechanically, so give a
  closed set of verdicts and require one per item. An agent reporting in free prose reports inconsistently.
- **State what done looks like.** Without a completion criterion the agent returns early on the first ambiguity, or
  works past the point the caller needed.
- **Say that the summary is the product.** Locate with Grep before reading whole files, and return findings rather than
  the material they came from.

Creation methods, tool sets by agent type, model selection and resolution order, the prompt skeleton, and four
agent-type templates: [`${CLAUDE_SKILL_DIR}/references/creation.md`]. Read it before writing a new definition file.

## Calibrate reviewing and auditing agents

An agent that finds problems will find problems. Left uncalibrated it treats an empty report as a failed run and
manufactures findings to look diligent — which costs more than the review saves, because every false finding buys a
human ruling. State the control explicitly in the prompt:

- **Name the empty result as a success.** "A clean audit that names what it checked is a useful result." Without this
  the agent infers the opposite.
- **Do not scale findings to input size.** A 25-line document audited to two findings is a correct report, not a lazy
  one. This bounds invention, never suppression: a diff with forty real violations reports forty. Volume is a failure
  only when the findings were manufactured to produce it.
- **Split the burden of proof by finding type.** On bright-line rules, flag every violation — a dismissed finding is
  cheaper than a missed one. On judgment calls the burden is on the finding: where the agent cannot argue it, the
  verdict is OK and nothing is reported.
- **Require evidence for claims of absence.** "No caller", "no test", "not used anywhere" carry the exact command run
  and what it returned. An absence with no sweep behind it is not reported.
- **Separate "not worth reporting" from "could not check".** OK closes a judgment call the agent weighed and rejected.
  Unverified is for a claim it could not settle — the test would not run, the platform was unavailable, the evidence was
  out of scope — and it names what would settle it. A finding is never silently dropped for lack of evidence, and never
  promoted to confirmed without it.

## Run mutating agents isolated

An agent whose _method_ mutates the tree — a test auditor that breaks code to prove a test catches it, a migration
prover, anything running a negative control — needs `isolation: worktree`, not merely permission to edit. The risk is
not two agents colliding but one agent crashing mid-mutation and stranding a broken tree that its caller believes is
clean.

- **Never end a run with a mutation in place.** If a tool error or a timeout interrupts a control, restoring the tree is
  the first action before anything else.
- **Restore and verify.** Reverse the edit, then confirm with `git diff` that the file is back to its pre-mutation
  state. An unverified restore is an unrestored file.
- **Mutate the subject, never the instrument.** A test auditor changes the code under test, never the test.

## Coordinate several agents through the return path

- **A standalone subagent injects its full output into the caller's context; a teammate returns only what it sends.**
  Three verbose standalone agents can exhaust the caller, which is what makes a team cheaper past a small fan-out.
- **Use a team where the work shares findings or has ordering**, and carry the ordering as `blockedBy` on a shared task
  list. Independent one-shot work stays cheaper as standalone spawns.
- **Every task description stands alone.** Teammates share no conversation history, so file paths, identifiers, and
  acceptance criteria live in the description itself.

Pipeline, parallel fan-out, orchestrator-workers, agent teams end to end, worktree isolation, background execution, the
Agent SDK, and six complete agent definitions: [`${CLAUDE_SKILL_DIR}/references/patterns.md`]. Read it when more than
one agent is involved, or when the run is backgrounded or driven from the SDK.

## Measure before other people depend on it

**Score trigger accuracy separately from output quality.** They break for different reasons and take different fixes — a
wrong description misroutes, a wrong body misreports — and a single overall impression hides which one failed. The
requests that should route elsewhere are where a description fails, and they are the cases nobody runs by accident.

The five weighted scoring dimensions with their score guides, the quality thresholds, the five-level testing protocol,
and regression benchmarking: [`${CLAUDE_SKILL_DIR}/references/evaluation.md`]. Read it when scoring an agent, or before
other people depend on one.

Symptom-to-cause-to-fix for discovery failures, tool permissions, stalled teammates, background agents, worktree
cleanup, hooks, and the SDK: [`${CLAUDE_SKILL_DIR}/references/troubleshooting.md`]. Read it when an agent fails outright
rather than underperforms.
