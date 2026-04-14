# Evaluating Subagents

Reference for the `subagent-engineering` skill. Covers the five-dimension scoring rubric, testing protocol, and
benchmarking practices for Claude Code subagents.

---

## Scoring Rubric

Evaluate on five dimensions. Each dimension has a weight; final score is the weighted sum (max 5.0).

### Dimension Weights

- **Task completion** — 30%
- **Trigger accuracy** — 25%
- **Output quality** — 25%
- **Context efficiency** — 10%
- **Tool usage** — 10%

Task completion carries the highest weight: an agent that doesn't finish its job fails regardless of other qualities.

---

### 1. Task completion (30%)

Does the agent reliably complete the work it is invoked to do?

Score guide:

- **5** — Always completes; handles edge cases gracefully
- **4** — Completes in normal cases; minor gaps at edges
- **3** — Completes most cases; notable gaps
- **2** — Frequent incompletion; returns early
- **1** — Rarely or never completes

Common causes of low scores:

- No numbered sequential steps → agent loses track of order
- Missing explicit completion criteria → agent returns too early
- No completion checklist → skips verification steps

---

### 2. Trigger accuracy (25%)

Does the agent activate for the right requests, and only those requests?

Score guide:

- **5** — Activates precisely for intended scope; never for out-of-scope
- **4** — Occasional edge-case misfires; core scope correct
- **3** — Over- or under-triggering in ~20% of cases
- **2** — Significant misfiring; scope poorly defined
- **1** — Broken — never delegates or always delegates wrong

Failure modes:

- **Over-triggering** — description too vague; matches unintended requests
- **Under-triggering** — description too specific; misses legitimate requests
- **Broken** — description has no delegation language; agent never activates

---

### 3. Output quality (25%)

Is the agent's output correct, well-structured, and usable without post-processing?

Score guide:

- **5** — Output matches expected format exactly; correct and complete
- **4** — Minor formatting deviations; content correct
- **3** — Output requires light editing; some gaps
- **2** — Structural problems; partial correctness
- **1** — Output unusable

Levers:

- Add explicit format specification (structure, sections, length)
- Provide a concrete output example in the system prompt
- Use prefill-style opening lines to anchor the response format

---

### 4. Context efficiency (10%)

Does the agent avoid wasting tokens — its own and the caller's?

Score guide:

- **5** — Reads only necessary files; minimal tool calls; compact output
- **4** — Occasional redundant reads; output slightly verbose
- **3** — Repeated reads; unnecessary exploration
- **2** — Excessive reads; output bloated
- **1** — Runaway tool calls; context exhaustion risk

Levers:

- Add efficiency instructions: "read each file at most once"
- Restrict model to `haiku` for simple tasks
- Narrow `tools` list to prevent exploratory tool use

---

### 5. Tool usage (10%)

Does the agent use the right tools correctly?

Score guide:

- **5** — Uses only permitted tools; correct tool for each operation
- **4** — Minor mismatches (e.g., Bash where Grep fits)
- **3** — Some unnecessary tool use or incorrect choices
- **2** — Frequent wrong-tool usage
- **1** — Attempts disallowed tools; breaks on permissions

Common issues:

- Tool name typos (exact match required: `Read`, `Write`, `Edit`, `Bash`, `Glob`, `Grep`)
- `disallowedTools` conflicts with `tools` list
- Agent tries tools not in its `tools` field

---

## Quality Thresholds

Map the weighted score to an action:

- **4.5–5.0** — Excellent. Monitor in production; no changes needed.
- **3.5–4.4** — Good. Minor prompt tuning; address lowest-scoring dimension.
- **2.5–3.4** — Fair. Significant rework; re-examine system prompt structure.
- **< 2.5** — Poor. Consider redesign or splitting into multiple agents.

---

## Testing Protocol

Five levels of testing, applied in order. Do not skip levels — later tests are only meaningful if earlier ones pass.

### Level 1: Smoke test

Verify the agent can be invoked at all.

- Does `@agent-name` resolve without "agent not found"?
- Does the agent respond to a minimal valid request?
- Does it complete without crashing?

Pass criteria: agent invokes and returns any output.

### Level 2: Functional test

Verify the agent completes its primary workflow.

- Run 3–5 representative requests covering the core use case
- Check output against expected structure and content
- Confirm no premature returns

Pass criteria: ≥ 80% of functional cases complete correctly.

### Level 3: Edge case test

Verify the agent handles boundary inputs gracefully.

- Empty inputs, missing files, ambiguous requests
- Inputs near the boundary of the agent's scope
- Large inputs that stress context limits

Pass criteria: agent degrades gracefully (clear error or partial output), does not crash.

### Level 4: Negative test

Verify the agent recognizes and rejects out-of-scope requests.

- Send requests that should NOT trigger the agent
- Confirm the agent declines or redirects rather than attempting
- Test the boundary between this agent's scope and adjacent agents

Pass criteria: agent correctly declines or defers ≥ 90% of out-of-scope requests.

### Level 5: Integration test

Verify the agent coordinates correctly in multi-agent workflows.

- Run as part of a pipeline or agent team
- Confirm `SendMessage` summaries are concise (< 500 tokens)
- Confirm `blockedBy` dependencies resolve correctly
- Verify output format is consumable by downstream agents

Pass criteria: no coordination failures; downstream agents receive usable input.

---

## Benchmarking

Use a fixed test suite to detect regressions across versions.

### Building a test suite

Create 10–20 test cases covering:

- Core use cases (≥ 50% of suite)
- Edge cases (≥ 20%)
- Negative / out-of-scope cases (≥ 20%)
- Integration scenarios if the agent participates in pipelines

Store test cases as markdown files with:

- **Input** — the request
- **Expected output** — structure, key content, or exact text
- **Expected behavior** — completes / declines / delegates

### A/B testing between versions

When iterating on a prompt:

1. Run the full test suite on version A; record dimension scores
2. Apply the change to get version B
3. Run the same suite on version B
4. Compare per-dimension deltas — a gain in one dimension should not cause regression in another

Accept the change only if the weighted score improves or holds, with no dimension dropping more than 0.5 points.

### Regression detection

Run the test suite after any system prompt change, tool list change, or model change. Flag any case that was passing and
now fails — this is a regression, not just a score change.

---

## Continuous Monitoring

Beyond structured testing, monitor agents in active use.

**Session reviews:**

- After each session where an agent was invoked, note any unexpected behavior
- Check for trigger misfires (wrong agent activated or failed to activate)
- Check for incomplete outputs or tool permission errors

**Monthly audits:**

- Run the full test suite
- Re-score all five dimensions
- Update the test suite with new cases discovered during use

**When to re-evaluate:**

- After any change to the agent's system prompt
- After adding or removing tools
- After changing the model
- After upstream context changes (new CLAUDE.md rules, new hook behavior)
