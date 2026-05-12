---
name: research
description: >-
  Objective codebase investigation — factual findings about existing code,
  patterns, and architecture. Invoke whenever task involves the R stage of
  the DRAFT pipeline, technical codebase research, or understanding existing
  code before design.
---

# Research

Objective codebase investigation that produces factual findings **blind to the intent** expressed in the discovery
brief. The lead reads the brief and generates neutral questions. Teammates investigate the codebase. The lead compiles
findings. No teammate ever sees the brief, the ticket, or the user's goals.

## Environment

Agent teams: !`echo ${CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS:-disabled}`

## Prerequisites

1. If agent teams shows `disabled` above, stop immediately and tell the user:
   > Agent teams are required for parallel research. Enable them by adding to your settings:
   >
   > ```json
   > { "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" } }
   > ```
   >
   > Then restart the session.
2. Locate the brief:
   - **Discovery handoff** — the brief is already in conversation context. Use it directly.
   - **Standalone invocation** — `$ARGUMENTS` names a brief, or ask the user to provide one. Read it into conversation
     context — the skill works from context.
   - If no brief exists in conversation or on disk, ask the user whether to run discovery first.

## Process

### Phase 1 — Plan and Dispatch

1. Read the brief from conversation context.
2. Identify the codebase scope clusters the brief touches (modules, directories, subsystems).
3. For each scope, formulate the questions worth investigating. Follow the question generation rules below.
   - Multiple questions per scope is normal. Group questions that share files to avoid duplicate reads across teammates.
   - Don't fix a question count up-front. Let the brief's complexity determine how many.
4. Self-check questions against the bias validation gate.
5. Create team `research-{slug}` via TeamCreate.
6. For each scope cluster, create a task via TaskCreate using the task description format below, then spawn one teammate
   via Agent with `subagent_type: "codebase-researcher"`, `team_name: "research-{slug}"`, and an intent-free spawn
   prompt (see Spawn Prompt below).
   - Task descriptions contain only questions and scope boundaries. Never the brief, ticket, or intent.
   - Explicit `subagent_type` ensures the teammate inherits the agent's tool restrictions and system prompt; without it,
     the platform falls back to the general-purpose agent.

### Phase 2 — Collect and Iterate

Research proceeds in **waves**. A wave is a set of teammates dispatched together. Never start a new wave while the
current one is still running.

7. Wait until **all** teammates in the current wave have completed and sent their findings.
8. Once the wave is fully in, evaluate:
   - Are any questions still unanswered or have only partial answers?
   - Did any finding reveal a new scope or codebase area that wasn't initially identified?
   - Are there new questions that emerged from the findings (not from the brief) that need investigation?
9. If yes to any of the above, plan and dispatch a new wave: identify new scopes, formulate questions for them, run the
   bias self-check, create tasks, spawn new teammates on the same team. Then return to step 7 for the new wave.
10. If no further investigation is needed, proceed to Phase 3.

Why waves: dispatching follow-ups while a wave is still running causes redundant investigation — a sibling teammate may
already be answering the question you're about to ask. Batching by wave lets findings inform each other.

### Phase 3 — Compile and Persist

By this point all waves are complete and no further teammates will be dispatched. The information barrier no longer
applies.

11. Compile all findings into `design-docs/NN-name.research.md` as sole author using the document format below.
    - Organize by scope cluster, not by teammate.
    - Preserve concrete file paths, function names, and line references from teammate findings.
    - Flag contradictions or gaps explicitly.
    - Do not inject opinions, recommendations, or solution ideas.
12. If the brief was not yet written to disk (discovery handoff flow), write it now as `design-docs/NN-name.brief.md`.
13. Present the compiled research.md to the user for review.

### Phase 4 — Cleanup

14. Shut down all teammates.
15. Clean up the team.
    - If cleanup fails, halt immediately and prompt the user:
      > Team cleanup failed. Please verify the team state manually before proceeding.

### Transition

16. On user approval of research.md, offer: "Proceed to `alignment` skill?"

## Question Generation Rules

Every question must request a fact, never an opinion, assessment, or judgment. Teammates can only return facts; asking
them for evaluation produces speculation, not evidence. If the brief frames something as a problem to solve or a quality
to improve, translate it into factual questions about what currently exists — never pass the framing through.

### Verb Rules

**Use:** "document", "identify", "describe", "trace", "characterize", "examine", "list", "map"

**Ban:** "should", "must", "improve", "fix", "optimize", "enhance", "refactor", "recommend", "suggest", "better", "needs
to"

### Investigation Types

Each question targets one of these:

- **Structure** — what components exist, how they are organized, what their interfaces are
- **Logic** — execution paths, control flow, conditional branches as written
- **Integration** — what connects to what, dependencies, data flow across boundaries
- **Patterns** — conventions followed, architectural patterns used, consistency or inconsistency

### Bias Validation Gate

Before presenting questions to the user, self-check:

1. **Prescriptive language scan** — does any question contain banned verbs or imply a desired outcome? Rewrite it.
2. **Intent masking test** — if someone read only the questions without the brief, could they infer the solution
   direction? If yes, the questions leak bias. Rewrite to ask about what exists, not what needs to change.
3. **Balance check** — do questions cover at least three of the four investigation types? If they cluster in one, add
   questions for underrepresented types.

<examples>
<example name="good-neutral-questions">
- "Describe the data flow from user input to persistence in the authentication module."
- "Identify all callers of `SessionManager.create()` and trace how the return value is consumed."
- "Map the error handling patterns used across the API middleware stack."
- "List the external dependencies of the notification subsystem and document their integration points."
</example>

<example name="bad-biased-questions">
- "How could the authentication module be improved to support OAuth?" — leaks solution direction
- "What are the performance bottlenecks in the session manager?" — assumes problems exist
- "Which parts of the API middleware need refactoring?" — prescribes action
</example>
</examples>

## Scope Clustering

Group questions by the codebase area they investigate, not by topic.

### Heuristic

1. Identify the primary directories or modules each question targets.
2. Questions targeting the same directory tree or tightly coupled modules → same cluster.
3. Questions spanning the whole codebase → assign to the scope where the pattern is most concentrated, or create a
   dedicated cross-cutting cluster.
4. Name each cluster by its codebase area: "auth module", "API layer", "data persistence", etc.

### Task Description Format

Each task description dispatched to a teammate must include exactly:

```
## Questions
1. [question text]
2. [question text]

## Scope
Directories: [paths]
Focus: [one-line description of the codebase area]

## Instructions
Investigate these questions by reading files within the scope above. Send one structured finding per
question to the team lead via SendMessage. Mark the task complete when all questions are answered.
```

Nothing else. No brief context, no intent, no background.

### Spawn Prompt

The `prompt` parameter on the Agent call is visible to the teammate. The leak we care about is **intent**, not
**context**. Distinguish:

- **Context (allowed)** — what the teammate is doing, where they're working, what role they play. The project name, the
  scope area they'll investigate, the fact that they're doing read-only codebase research. None of this biases the
  investigation.
- **Intent (forbidden)** — why we're investigating, what problem we're trying to solve, what change we're considering,
  what outcome we want, any framing that suggests a desired direction. This is what taints the research.

The teammate already gets stable context from its agent definition (role, tools, output format). The spawn prompt can
add light orientation — project name, scope tag, "claim a task" routing — but every word should pass the test: _would
removing this change what the teammate looks for?_ If yes, it's intent. If no, it's safe context.

<examples>
<example name="safe-spawn-prompts">
- "You're a codebase-researcher on team research-auth-rework. Claim a task and follow its instructions."
- "Investigating the cc-foundry plugins directory. Claim your task on team research-{slug}."
</example>

<example name="leaky-spawn-prompts">
- "We're trying to add OAuth to the auth module — claim your task." — leaks the goal
- "Help us figure out why the API middleware is slow." — assumes a problem, frames the search
- "Find out where we'd need to refactor for the new caching layer." — leaks the change being considered
</example>
</examples>

## Research Document Format

```markdown
# Research: {title from brief}

- **Date:** {date}
- **Teammates:** {count}
- **Scopes investigated:** {list of scope cluster names}

## {Scope Cluster Name}

### Files Investigated

- `path/to/file.ts` — {what it contains}

### Findings

**{Question text}**

{Compiled finding — concrete, factual, with file:line references}

### Patterns

{Patterns observed — include prevalence (e.g., "dominant in 12/15 files" vs "isolated instance")}

### Integration Points

{How this scope connects to other parts of the codebase}

### Open Gaps

{What could not be determined}

## Cross-Cutting Observations

{Patterns or findings that span multiple scopes — only if such observations exist}

## Unresolved Questions

{Questions that teammates could not answer from the files — only if any remain}
```

## Rules

- **Write the brief to disk only in Phase 3, after all waves complete.** Teammates have Read/Grep/Glob and can encounter
  any file in the project. The brief contains intent — if it exists on disk during investigation, the information
  barrier is broken.
- **Task descriptions contain only questions and scope boundaries** — teammates never see the brief.
- **Spawn prompts carry context, never intent.** The `prompt` parameter on Agent is visible to the teammate. Project,
  scope area, role are fine. Goals, problems being solved, desired outcomes, or any framing that suggests a direction
  bias the investigation.
- **You are sole author of research.md.** No teammate writes to any file.
- **research.md contains factual observations with file references** — interpretation belongs in the alignment stage.
- **Halt on cleanup failure.** If team shutdown or cleanup fails, stop and prompt the user. Do not proceed with a dirty
  team state.
- **Batch by wave, not by urgency.** A follow-up question that seems urgent may already be under investigation by a
  sibling teammate. Wait for the full wave before deciding what's still unanswered.
