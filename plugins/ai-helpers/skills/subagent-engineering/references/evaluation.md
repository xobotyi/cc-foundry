# Evaluating Subagents

Framework for assessing subagent quality and effectiveness.

## Evaluation Dimensions

### 1. Trigger Accuracy

Does Claude delegate to this agent at the right times?

**Test scenarios:**
- Direct invocation: "Use the [agent] to [task]"
- Implicit match: Describe a task that should trigger delegation
- Non-match: Describe similar but different tasks (should NOT trigger)

**Scoring:**
| Outcome | Score | Action |
|---------|-------|--------|
| Delegates correctly when should | Good | — |
| Delegates when shouldn't | Over-triggering | Narrow description |
| Doesn't delegate when should | Under-triggering | Broaden description |
| Never delegates | Broken | Check name/description format |

**Common issues:**
- Description too vague → over-triggers on unrelated tasks
- Description too specific → under-triggers on valid tasks
- Typo in name → never found

### 2. Task Completion

Does the agent accomplish its intended purpose?

**Evaluate:**
- Does it follow the specified workflow?
- Does it produce the expected output format?
- Does it handle edge cases?
- Does it stay within scope?

**Test matrix:**
| Input Type | Expected Behavior |
|------------|-------------------|
| Happy path | Complete successfully |
| Edge case | Handle gracefully |
| Invalid input | Fail clearly with explanation |
| Out of scope | Recognize and decline |

### 3. Output Quality

Is the agent's output useful and actionable?

**Criteria:**
- **Clarity:** Is the output easy to understand?
- **Completeness:** Does it include all necessary information?
- **Actionability:** Can the user/parent agent act on it?
- **Format compliance:** Does it match specified structure?

**Red flags:**
- Raw data dumps without synthesis
- Missing key information
- Inconsistent formatting
- Scope creep (doing more than asked)

### 4. Context Efficiency

Does the agent use context wisely?

**Measure:**
- How much context does it consume?
- Does it return concise summaries?
- Does it avoid unnecessary tool calls?

**Good patterns:**
- Returns synthesized findings, not raw search results
- Uses parallel tool calls when possible
- Stops when task is complete

**Bad patterns:**
- Reads entire codebase for simple lookup
- Returns verbose output to parent
- Continues working after task is done

### 5. Tool Usage

Does the agent use tools appropriately?

**Check:**
- Uses only granted tools
- Doesn't attempt dangerous operations
- Makes efficient use of tools
- Handles tool errors gracefully

**Scoring:**
| Behavior | Assessment |
|----------|------------|
| Uses minimal necessary tools | Good |
| Makes redundant tool calls | Inefficient |
| Attempts blocked tools | Over-scoped |
| Ignores available useful tools | Under-utilizing |

## Evaluation Checklist

Run through this checklist for each subagent:

### Description Quality
- [ ] Clearly states what the agent does
- [ ] Clearly states when to use it
- [ ] No execution instructions in description
- [ ] Under 1024 characters

### Trigger Behavior
- [ ] Delegates on direct invocation
- [ ] Delegates on implicit matching tasks
- [ ] Does NOT delegate on unrelated tasks
- [ ] Delegation speed is acceptable

### Task Execution
- [ ] Follows specified workflow
- [ ] Produces correct output format
- [ ] Handles happy path correctly
- [ ] Handles edge cases gracefully
- [ ] Recognizes out-of-scope requests

### Output Quality
- [ ] Clear and understandable
- [ ] Contains necessary information
- [ ] Actionable by recipient
- [ ] Consistent format across runs

### Resource Usage
- [ ] Reasonable context consumption
- [ ] Efficient tool usage
- [ ] Concise return to parent

## Testing Protocol

### Level 1: Smoke Test

Quick validation that agent works at all:

```
Use the [agent-name] subagent to [simple representative task]
```

**Pass criteria:** Agent is invoked, produces output, returns to parent.

### Level 2: Functional Test

Test core functionality:

```
# Happy path
Use the [agent] to [typical use case]

# Verify workflow steps are followed
# Verify output format is correct
```

**Pass criteria:** Workflow executed correctly, output matches spec.

### Level 3: Edge Case Test

Test boundary conditions:

```
# Empty/minimal input
Use the [agent] with [minimal input]

# Large input
Use the [agent] on [large codebase/dataset]

# Ambiguous input
Use the [agent] for [ambiguous request]
```

**Pass criteria:** Handles gracefully without crashing or hallucinating.

### Level 4: Negative Test

Test what should NOT happen:

```
# Out of scope request
Use the [agent] for [unrelated task]

# Should reject or clarify, not attempt
```

**Pass criteria:** Agent recognizes scope boundary, doesn't attempt.

### Level 5: Integration Test

Test in realistic workflow:

```
# Chain with other agents
Use [agent-1] to [task], then use [agent-2] to [follow-up]

# Parallel execution
Research [topic-a] and [topic-b] in parallel using subagents
```

**Pass criteria:** Works correctly in multi-agent context.

## Comparative Evaluation

When you have multiple versions or similar agents:

### A/B Testing

Run same task with both versions:

```
# Version A
Use the code-reviewer to review the authentication module

# Version B (different prompt)
Use the code-reviewer-v2 to review the authentication module
```

Compare:
- Trigger accuracy
- Output quality
- Context usage
- Completion time

### Benchmarking

Create a standard test suite:

```markdown
## Test Suite: Code Reviewer

### Test 1: Simple function
Input: [single function with obvious issue]
Expected: Identifies issue, suggests fix

### Test 2: Security vulnerability
Input: [code with SQL injection]
Expected: Flags as critical, explains risk

### Test 3: Clean code
Input: [well-written code]
Expected: Minimal feedback, no false positives
```

Run periodically to catch regressions.

## Quality Scoring

Rate each dimension 1-5:

| Dimension | Score | Weight |
|-----------|-------|--------|
| Trigger Accuracy | ? | 25% |
| Task Completion | ? | 30% |
| Output Quality | ? | 25% |
| Context Efficiency | ? | 10% |
| Tool Usage | ? | 10% |

**Overall = weighted average**

| Score | Rating | Action |
|-------|--------|--------|
| 4.5+ | Excellent | Monitor only |
| 3.5-4.4 | Good | Minor improvements |
| 2.5-3.4 | Fair | Significant revision needed |
| <2.5 | Poor | Redesign from scratch |

## Continuous Monitoring

### Session Review

After using an agent, note:
- Did it trigger correctly?
- Was output useful?
- Any unexpected behavior?

### Periodic Audit

Monthly review:
- Run test suite
- Check for regressions
- Update for new requirements
- Archive unused agents
