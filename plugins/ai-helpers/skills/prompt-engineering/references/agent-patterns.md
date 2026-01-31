# Agent & Tool Patterns

Techniques for LLM agents that reason and act in the world.

## Contents

- [ReAct (Reasoning + Acting)](#react-reasoning--acting)
- [PAL (Program-Aided Language Models)](#pal-program-aided-language-models)
- [Reflexion](#reflexion)
- [ART (Automatic Reasoning and Tool-use)](#art-automatic-reasoning-and-tool-use)
- [Generated Knowledge Prompting](#generated-knowledge-prompting)
- [Pattern Selection](#pattern-selection)
- [References](#references)

## ReAct (Reasoning + Acting)

Interleave reasoning traces with actions. The model thinks about what
to do, does it, observes the result, then thinks again.

### The Pattern

```
Thought: I need to find X to answer this question
Action: Search[X]
Observation: [result from search]
Thought: Now I know X, but I also need Y
Action: Search[Y]
Observation: [result from search]
Thought: With X and Y, the answer is...
Action: Finish[answer]
```

### Why It Works

- **Reasoning grounds actions:** Thoughts explain why an action is taken
- **Actions ground reasoning:** Observations provide facts for next thought
- **Traceable:** Full audit trail of decision process
- **Recoverable:** Can adjust strategy based on observations

### ReAct vs Pure Reasoning

| Aspect | CoT Only | ReAct |
|--------|----------|-------|
| External info | None | Retrieved as needed |
| Hallucination | Higher (relies on memory) | Lower (grounded in observations) |
| Flexibility | Fixed knowledge | Dynamic knowledge gathering |
| Complexity | Simpler | Requires tool integration |

### Implementation

```
You have access to these tools:
- Search[query]: Search for information
- Lookup[term]: Look up a term in current context
- Finish[answer]: Return final answer

For each step, output:
Thought: [your reasoning]
Action: [tool call]

Wait for Observation before next Thought.
```

### When to Use ReAct

**Ideal for:**
- Knowledge-intensive QA (need current/accurate facts)
- Multi-hop reasoning (answer depends on multiple lookups)
- Tasks requiring external tool use
- Decision-making with environmental feedback

**Limitations:**
- Depends on retrieval quality
- Can get stuck in loops
- More expensive (multiple tool calls)

---

## PAL (Program-Aided Language Models)

Offload computation to a code interpreter. Model generates code instead
of computing directly.

### The Pattern

```
Question: Roger has 5 tennis balls. He buys 2 cans of 3 balls each.
How many does he have now?

# Let me write code to solve this
start_balls = 5
cans_bought = 2
balls_per_can = 3
new_balls = cans_bought * balls_per_can
total = start_balls + new_balls
print(total)  # Execute this
```

Output: `11`

### Why It Works

- **Precise computation:** Code doesn't make arithmetic errors
- **Complex logic:** Loops, conditions, data structures available
- **Verifiable:** Code can be inspected and tested
- **Scalable:** Works for any computation complexity

### When to Use PAL

**Ideal for:**
- Math word problems
- Date/time calculations
- Data transformation
- Any task requiring precise computation

**Avoid when:**
- Task is purely linguistic
- No code interpreter available
- Simple enough for direct answer

### Implementation Pattern

```
Solve this problem by writing Python code.
Think through the problem, then write code that computes the answer.
The code will be executed and the output returned.

Problem: [problem here]
```

---

## Reflexion

Self-reflection for learning from errors across attempts.

### The Pattern

```
Attempt 1:
  Action: [try solution]
  Result: [failed - reason X]
  Reflection: "I failed because X. Next time I should Y."

Attempt 2:
  [Uses reflection to avoid previous mistake]
  Action: [improved solution]
  Result: [success or new failure]
  Reflection: [updates understanding]
```

### Components

**Actor:** Generates actions based on state + reflections
**Evaluator:** Scores the result (pass/fail, reward signal)
**Self-Reflection:** Converts failure into verbal feedback for next attempt

### Why It Works

- **Episodic memory:** Past reflections inform future attempts
- **Verbal feedback:** More nuanced than scalar rewards
- **No retraining:** Improvement through prompt context alone

### When to Use Reflexion

**Ideal for:**
- Sequential decision-making (games, navigation)
- Programming tasks (iterative debugging)
- Reasoning with multiple attempts allowed
- Tasks where trial-and-error is acceptable

**Limitations:**
- Requires multiple attempts (cost)
- Self-evaluation may be unreliable
- Memory window limits history

### Implementation Pattern

```
You have {max_attempts} attempts to solve this.

After each attempt, if it fails:
1. Analyze why it failed
2. Write a reflection: what you learned and what to try differently
3. Use your reflections to improve the next attempt

Previous reflections:
{reflections_from_past_attempts}

Current attempt:
```

---

## ART (Automatic Reasoning and Tool-use)

Automatically select reasoning chains and tools from a library based
on the task.

### The Pattern

1. Match new task to similar tasks in library
2. Retrieve relevant reasoning templates + tool usage patterns
3. Apply templates to new task
4. Pause for tool execution when needed
5. Integrate tool output and continue

### Key Insight

Don't hand-craft demonstrations for every task. Maintain a library of
task-specific reasoning patterns and retrieve relevant ones at runtime.

### When to Use ART

**Ideal for:**
- Many task types with known patterns
- Generalizing tool use to new tasks
- Reducing per-task prompt engineering

---

## Generated Knowledge Prompting

Generate relevant knowledge before answering.

### The Pattern

```
Step 1: "Generate 3 facts relevant to this question: [question]"
→ [generated facts]

Step 2: "Using these facts, answer: [question]"
→ [grounded answer]
```

### Why It Works

- Activates relevant pre-trained knowledge
- Provides explicit context for reasoning
- Reduces hallucination by grounding in generated facts

### Example

```
Question: "Part of golf is trying to get a higher point total than
others. Yes or No?"

Step 1 - Generate knowledge:
"The objective of golf is to hit a ball into holes using the fewest
strokes. The player with the lowest score wins."

Step 2 - Answer with knowledge:
Using the fact that golf rewards lowest score, the answer is No.
```

### When to Use

**Ideal for:**
- Commonsense reasoning
- Questions requiring world knowledge
- When RAG isn't available but grounding helps

**Limitation:**
- Generated knowledge may be wrong (model hallucination)
- Two-step adds latency

---

## Pattern Selection

| Task Type | Pattern |
|-----------|---------|
| Need external information | ReAct |
| Precise calculation | PAL |
| Multi-attempt allowed | Reflexion |
| Many similar task types | ART |
| Commonsense gaps | Generated Knowledge |
| Simple reasoning | Standard CoT |

## Combining Patterns

Patterns compose:

- **ReAct + Reflexion:** Reflect on failed action sequences
- **CoT + PAL:** Reason through problem, then code the computation
- **ReAct + Self-Consistency:** Multiple ReAct traces, majority answer

---

## References

- ReAct: Yao et al., 2022 — [arXiv:2210.03629](https://arxiv.org/abs/2210.03629)
- PAL: Gao et al., 2022 — [arXiv:2211.10435](https://arxiv.org/abs/2211.10435)
- Reflexion: Shinn et al., 2023 — [arXiv:2303.11366](https://arxiv.org/abs/2303.11366)
- ART: Paranjape et al., 2023 — [arXiv:2303.09014](https://arxiv.org/abs/2303.09014)
- Generated Knowledge: Liu et al., 2022 — [arXiv:2110.08387](https://arxiv.org/abs/2110.08387)
