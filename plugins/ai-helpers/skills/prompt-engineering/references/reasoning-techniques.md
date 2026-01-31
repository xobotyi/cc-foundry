# Reasoning Techniques

Deep dive into techniques that enhance LLM reasoning capabilities.

## Contents

- [Chain-of-Thought (CoT)](#chain-of-thought-cot)
- [Tree-of-Thoughts (ToT)](#tree-of-thoughts-tot)
- [Self-Consistency](#self-consistency)
- [Extended Thinking](#extended-thinking)
- [Model Scale Note](#model-scale-note)
- [References](#references)

## Chain-of-Thought (CoT)

CoT prompting guides models through step-by-step reasoning rather than
jumping directly to answers. It emerged from observing that larger models
can "think out loud" — and this explicit reasoning improves accuracy on
complex tasks.

### Why It Works

Models trained on massive datasets have learned reasoning patterns, but
standard prompting doesn't activate them. CoT explicitly requests the
intermediate steps, providing:

1. **Grounding** — each step anchors the next
2. **Error detection** — flawed logic becomes visible
3. **Transparency** — you can audit the reasoning path

### Variants

**Zero-shot CoT**
Simply append "Let's think step by step" or "Explain your reasoning."
No examples needed. Works when model has sufficient domain knowledge.

The phrase "Let's think step by step" was discovered by Kojima et al.
(2022) to unlock reasoning without examples. APE (Zhou et al., 2022)
later found "Let's work this out in a step by step way to be sure we
have the right answer" performs even better on some benchmarks.

```
Q: A bat and ball cost $1.10 total. The bat costs $1.00 more than
   the ball. How much does the ball cost?

Think through this step by step.
```

**Few-shot CoT**
Provide examples that demonstrate the reasoning pattern:

```
Q: There are 15 trees. Loggers cut down 3, then plant 5 more.
   How many trees remain?

A: Start with 15 trees.
   Loggers cut 3: 15 - 3 = 12 trees.
   Plant 5 more: 12 + 5 = 17 trees.
   Answer: 17 trees.

Q: [Your problem here]
A: Let me work through this...
```

**Auto-CoT** (Zhang et al., 2022)
Automatically generate reasoning chains without manual effort:

1. **Question clustering:** Partition questions into clusters by
   similarity
2. **Demo sampling:** For each cluster, select representative question
3. **Chain generation:** Use zero-shot CoT to generate reasoning chain
4. **Heuristic filtering:** Keep chains with reasonable length (~60
   tokens) and step count (~5 steps) to ensure quality

This eliminates hand-crafting while maintaining diversity. Simple
heuristics filter out complex or error-prone demonstrations.

### When to Use CoT

**Effective for:**
- Arithmetic and math word problems
- Multi-step logical reasoning
- Commonsense reasoning requiring inference
- Tasks where "showing work" matters

**Less effective for:**
- Simple factual recall
- Tasks with no clear reasoning steps
- Creative generation (may over-constrain)

### Limitations

- Computationally heavier (more tokens generated)
- Can produce plausible-sounding but incorrect reasoning
- Quality depends on prompt engineering skill
- Smaller models struggle even with CoT

---

## Tree-of-Thoughts (ToT)

ToT extends CoT by exploring multiple reasoning paths simultaneously,
evaluating branches, and backtracking when paths fail. It mimics how
humans solve complex problems — considering alternatives, not just
following one thread.

### Core Components

**1. Thought Decomposition**
Break the problem into atomic reasoning units. Size matters:
- Too large → can't evaluate properly
- Too small → overhead without benefit

For a planning task, a "thought" might be one decision point.
For math, it might be one equation transformation.

**2. Thought Generation**

*Sampling:* Generate multiple independent thoughts from the same state.
Good when solution space is diverse.

*Proposing:* Generate thoughts sequentially, each building on previous.
Good when thoughts must be consistent.

**3. State Evaluation**

*Value-based:* Score each state numerically (1-10) or categorically
(promising / uncertain / dead-end).

*Vote-based:* Compare multiple candidates, select best by consensus.

**4. Search Strategy**

*Breadth-First (BFS):* Explore all branches at current depth before
going deeper. Find shortest solution path.

*Depth-First (DFS):* Follow one branch deeply before backtracking.
Thorough exploration of each possibility.

### ToT vs CoT

| Aspect | CoT | ToT |
|--------|-----|-----|
| Paths explored | Single | Multiple |
| Backtracking | No | Yes |
| Evaluation | End only | Each step |
| Complexity | Lower | Higher |
| Best for | Clear problems | Exploratory problems |

### When to Use ToT

**Ideal for:**
- Puzzles (sudoku, crosswords)
- Strategic planning
- Creative writing with multiple valid directions
- Problems where initial choices constrain later options

**Avoid when:**
- Problem has obvious linear solution
- Computational budget is tight
- Speed matters more than optimality

### Implementation Pattern

```
1. Initialize: root = problem state
2. Generate: candidates = generate_thoughts(current_state)
3. Evaluate: scores = evaluate_thoughts(candidates)
4. Select: best = select_promising(candidates, scores)
5. Recurse: for each in best, repeat from step 2
6. Backtrack: if dead-end, return to previous branch
7. Terminate: when solution found or budget exhausted
```

---

## Self-Consistency

Instead of taking the first answer, sample multiple reasoning paths
and select the most frequent conclusion.

### Mechanism

1. Run the same CoT prompt multiple times (temperature > 0)
2. Each run may take different reasoning paths
3. Extract final answer from each
4. Return majority answer

### Why It Works

- Different reasoning paths may reach same correct answer
- Errors tend to be inconsistent across runs
- Correct answers cluster; mistakes scatter

### Example

```
Prompt: [Math problem with CoT instruction]

Run 1: ... reasoning ... Answer: 42
Run 2: ... different path ... Answer: 42
Run 3: ... another path ... Answer: 38
Run 4: ... reasoning ... Answer: 42
Run 5: ... reasoning ... Answer: 42

Majority: 42 (4/5 agreement)
```

### Trade-offs

**Pros:**
- Significant accuracy boost on reasoning tasks
- Simple to implement
- No additional training needed

**Cons:**
- Multiplies inference cost (N runs)
- Only helps when multiple paths to correct answer exist
- Doesn't help if model consistently makes same error

### Best Practices

- Use 5-10 samples (diminishing returns beyond)
- Higher temperature increases path diversity
- Works best with CoT (gives varied reasoning to sample)
- Consider confidence weighting, not just majority vote

---

## Extended Thinking

A distinct reasoning mode where Claude receives a dedicated "thinking
budget" separate from output tokens. Different from standard CoT.

### How It Differs from CoT

| Aspect | Standard CoT | Extended Thinking |
|--------|--------------|-------------------|
| Activation | Prompt ("think step by step") | API parameter |
| Token budget | Shared with output | Dedicated thinking budget |
| Prompting style | Prescriptive steps work well | High-level guidance better |
| Prefilling | Supported | Not supported |
| Visibility | Thinking in output | Thinking separate from output |

### When to Use Extended Thinking

**Ideal for:**
- Complex STEM problems (math, physics, programming)
- Constraint optimization (many competing requirements)
- Strategic planning with frameworks
- Problems requiring exploration of multiple approaches

**Use standard CoT instead when:**
- Problem is straightforward
- Budget is constrained
- Need to prefill response
- Thinking would be minimal (<1024 tokens)

### Prompting Strategy

**Standard CoT (prescriptive works):**
```
Think through this step by step:
1. First, identify the variables
2. Then, set up the equation
3. Solve for x
```

**Extended thinking (high-level better):**
```
Please think about this thoroughly. Consider multiple approaches.
Try different methods if your first approach doesn't work.
```

With extended thinking, Claude's creativity in approaching problems
often exceeds human-prescribed step-by-step guidance.

### Technical Requirements

- Minimum budget: 1024 thinking tokens
- For >32K thinking tokens: use batch processing
- Works best with English reasoning (output can be any language)
- Cannot combine with prefilling

### Self-Verification Pattern

Ask Claude to verify its work before completing:

```
Write a function to calculate factorial.
Before finishing, verify with test cases:
- n=0, n=1, n=5, n=10
Fix any issues you find.
```

This significantly improves correctness on coding and math tasks.

See [claude-specific.md](claude-specific.md) for full extended
thinking guidance.

---

## Model Scale Note

CoT and related reasoning techniques are **emergent abilities** — they
appear only in sufficiently large models. Wei et al. (2022) showed CoT
provides no benefit for small models and can even hurt performance.

Rule of thumb: If a model struggles with CoT, try:
1. Simpler prompts (zero-shot)
2. More examples (few-shot without CoT)
3. Larger model

---

## References

- Chain-of-Thought: Wei et al., 2022 — [arXiv:2201.11903](https://arxiv.org/abs/2201.11903)
- Zero-shot CoT: Kojima et al., 2022 — [arXiv:2205.11916](https://arxiv.org/abs/2205.11916)
- Auto-CoT: Zhang et al., 2022 — [arXiv:2210.03493](https://arxiv.org/abs/2210.03493)
- Tree-of-Thoughts: Yao et al., 2023 — [arXiv:2305.10601](https://arxiv.org/abs/2305.10601)
- Self-Consistency: Wang et al., 2022 — [arXiv:2203.11171](https://arxiv.org/abs/2203.11171)
