# Agent & Tool Patterns

Five patterns for building agents that reason, act, reflect, and adapt. Each targets a different failure mode in purely
generative LLM output.

---

## ReAct — Reasoning + Acting

**Paper:** Yao et al., 2022 — arXiv:2210.03629

ReAct interleaves verbal reasoning traces with discrete tool actions. The model alternates between `Thought` (internal
reasoning), `Action` (tool call), and `Observation` (tool result) steps, forming a trajectory. This loop continues until
the model produces a final answer.

**Core loop:**

```
Thought: I need to find the population of Tokyo.
Action: Search["Tokyo population 2024"]
Observation: Tokyo metropolitan area population is approximately 37.4 million.
Thought: I now have the answer.
Answer: 37.4 million
```

**Why it outperforms CoT alone:**

- CoT has no access to external state — hallucinations compound silently
- Pure acting (no reasoning) fails to decompose multi-step goals
- ReAct's reasoning targets _what to retrieve next_, grounding each step

**Why it outperforms pure acting:**

- Reasoning steps allow the model to detect retrieval failures and reformulate queries
- Thought traces improve human interpretability and auditability

**Known failure modes:**

- Non-informative search results derail the reasoning chain and are hard to recover from
- Structural constraint (Thought/Action/Observation) reduces flexibility vs free-form CoT
- Performs worse than CoT alone on HotPotQA; better on Fever — task-dependent

**Prompt construction:**

- Provide few-shot trajectories showing complete Thought/Action/Observation sequences
- For reasoning-heavy tasks: dense thought steps throughout the trajectory
- For decision-making tasks (navigation, shopping): sparse thoughts, more actions
- Exemplars come from the task's training set, formatted as ReAct trajectories

**Best combined with:** CoT + self-consistency for maximum performance on knowledge-intensive tasks

**Use when:** task requires fetching external information to answer correctly; multi-hop question answering; fact
verification; any tool-using agent where interpretability matters

---

## PAL — Program-Aided Language Models

**Paper:** Gao et al., 2022 — arXiv:2211.10435

PAL delegates solution computation to a programmatic runtime rather than performing arithmetic or logic in text. The LLM
generates a program (typically Python) as the intermediate reasoning step; a Python interpreter executes it and returns
the result.

**Core loop:**

```
Problem: [natural language problem]
→ LLM generates Python code
→ exec(code)
→ return result
```

**Key distinction from CoT:** CoT generates free-form text reasoning that the LLM also "evaluates". PAL offloads
evaluation to a deterministic runtime, eliminating arithmetic errors in the reasoning chain.

**Prompt construction:**

- Few-shot exemplars: each shows a natural language problem followed by the corresponding Python solution
- Exemplars should cover the reasoning patterns expected at test time (date arithmetic, unit conversion, counting)
- No special markers needed — the model learns the code generation format from examples

**Example exemplar structure:**

```python
# Q: What date is 3 weeks after March 5, 1998?
from datetime import datetime, timedelta
start = datetime(1998, 3, 5)
result = start + timedelta(weeks=3)
print(result.strftime('%m/%d/%Y'))
```

**Strengths:**

- Eliminates multi-step arithmetic errors (LLMs are unreliable accumulators)
- Python handles date math, unit conversion, combinatorics without hallucination
- Verifiable: code can be inspected, tested, re-run

**Limitations:**

- Only applicable when the solution can be expressed as executable code
- Requires a sandboxed runtime; security boundary is critical
- Fails on problems requiring open-ended natural language output as the answer

**Use when:** mathematical reasoning; symbolic computation; date/time arithmetic; any problem where the answer is
deterministic and expressible as a program

---

## Reflexion — Self-Reflection Loops

**Paper:** Shinn et al., 2023 — arXiv:2303.11366

Reflexion adds a self-improvement loop on top of ReAct. Rather than fine-tuning weights, it stores verbal
self-reflections in an episodic memory buffer and feeds them as context in subsequent episodes.

**Three-model architecture:**

- **Actor** — generates actions; uses CoT or ReAct; reads short-term (current trajectory) and long-term (reflection)
  memory
- **Evaluator** — scores the Actor's trajectory; outputs a reward signal (scalar or binary); can be an LLM or a
  rule-based heuristic
- **Self-Reflection model** — takes (reward signal + trajectory + persistent memory) → produces verbal feedback

**Episode loop:**

1. Actor generates trajectory (Thought/Action/Observation steps)
2. Evaluator scores the trajectory
3. Self-Reflection model generates a verbal critique stored in long-term memory
4. Next episode: Actor reads prior reflections as context, attempts the task again

**Memory management:**

- Short-term memory: current episode trajectory (sliding window)
- Long-term memory: accumulated self-reflections across episodes
- For complex tasks, the sliding window is the bottleneck — consider vector stores or SQL databases for large reflection
  sets

**Reported results:**

- AlfWorld (sequential decision-making): 130/134 tasks completed vs ReAct baseline
- HotPotQA (reasoning): Reflexion + CoT outperforms CoT alone and CoT + episodic memory
- HumanEval / MBPP / LeetCode Hard: state-of-the-art on Python and Rust code generation

**Limitations:**

- Requires accurate self-evaluation — if the Evaluator is wrong, reflections mislead rather than guide
- Does not converge if the task exceeds the model's capability ceiling
- Code generation: test-driven evaluation struggles with non-deterministic outputs and hardware-dependent functions

**Use when:** task allows multiple attempts with feedback (code, decision-making, reasoning); trial-and-error learning
without fine-tuning is required; nuanced verbal feedback is more useful than scalar rewards; interpretability of failure
modes matters

---

## ART — Automatic Reasoning and Tool-use

**Paper:** Paranjape et al., 2023 — arXiv:2303.09014

ART automates the construction of ReAct-style prompts. Instead of hand-crafting task-specific demonstrations, ART
retrieves relevant multi-step reasoning + tool-use examples from a curated **task library**, injects them at inference
time, and pauses generation when a tool call is detected.

**Mechanism:**

1. Given a new task, select closest demonstrations from the task library (multi-step reasoning + tool calls)
2. At inference time: generate until a tool call is detected → pause → execute tool → inject result → resume
3. Humans can add new tools or fix reasoning steps by updating the task library and tool library — no model retraining

**What makes it different from ReAct:**

- ReAct requires hand-crafted per-task demonstrations; ART retrieves them automatically in zero-shot fashion
- ART separates the tool library (callable functions) from the task library (reasoning demonstrations)
- Extensible: new tools and reasoning patterns can be added without touching the model

**Task library design:**

- Entries: (task description, multi-step reasoning trajectory with tool calls)
- Retrieval: semantic similarity between new task and library entries
- Quality of retrieved demonstrations directly determines reasoning quality

**Tool library design:**

- Entries: (tool name, description, invocation schema)
- Tools are paused-and-resumed at generation time — the model does not need to know tool internals
- Human corrections to the tool library take effect immediately

**Benchmarks:** Substantially improves over few-shot and automatic CoT on BigBench and MMLU unseen tasks; exceeds
hand-crafted CoT when human feedback is incorporated.

**Use when:** you have a diverse task space where hand-crafting per-task demonstrations is impractical; you want
zero-shot generalization over a tool-equipped reasoning system; extensibility (adding tools without retraining) is a
requirement

---

## ACE — Agentic Context Engineering

**Paper:** Zhang et al., 2025 — arXiv:2510.04618 (ICLR 2026)

ACE treats contexts (system prompts, agent memory) as **evolving playbooks** rather than static inputs. It addresses two
failure modes in prior self-improving systems:

- **Brevity bias** — reflection systems produce concise summaries that drop domain-specific insights
- **Context collapse** — iterative rewriting degrades accumulated knowledge over time

**Core insight:** rather than rewriting the context on each update, ACE performs structured, incremental updates that
_accumulate and organize_ strategies without replacing prior knowledge.

**Three-stage pipeline:**

- **Generation** — agent executes a task and collects execution traces / feedback
- **Reflection** — analyzes traces to extract strategy-level insights (not episode summaries)
- **Curation** — merges new insights into the existing context using structured incremental updates; deduplicates and
  organizes without erasing

**Two operating modes:**

- **Offline** — optimizes static artifacts (system prompts, tool descriptions) before deployment using historical
  trajectories
- **Online** — updates agent memory in real time during deployment using natural execution feedback (no labeled
  supervision required)

**Key design choices that prevent collapse:**

- Incremental appends with structured organization (not full rewrites)
- Curation step explicitly deduplicates and categorizes before merging
- Compatible with long-context models — scales context size rather than compressing it

**Reported results:**

- +10.6% on agent benchmarks vs strong baselines
- +8.6% on finance domain-specific reasoning
- Matches top-ranked production agent on AppWorld leaderboard using a smaller open-source model
- Reduces adaptation latency and rollout cost vs fine-tuning approaches

**Use when:** agent needs to improve from its own execution history without labeled data; system prompts need continuous
refinement based on production feedback; long-running agents where context collapse is a risk; you want self-improvement
without model fine-tuning

---

## Pattern Selection Guide

**Problem → pattern mapping:**

- Need external information to answer → **ReAct**
- Answer is a computation (math, dates, logic) → **PAL**
- Task allows retry with feedback, needs trial-and-error learning → **Reflexion**
- Diverse task space, need automatic demonstration selection → **ART**
- Agent/prompt needs to improve from its own execution history → **ACE**

**Combinations that work:**

- ReAct + CoT + self-consistency — best for knowledge-intensive single-shot tasks
- ReAct + Reflexion — multi-episode improvement on decision-making and coding
- ART + Reflexion — automatic demonstrations with self-improvement loop
- ACE offline → ACE online — bootstrap system prompt offline, then adapt in production

**When NOT to use each:**

- ReAct: task is purely internal reasoning with no external state to query
- PAL: answer cannot be expressed as executable code; open-ended generation required
- Reflexion: task has no retry semantics; evaluator accuracy is too low to trust self-reflection
- ART: task space is narrow and static (hand-crafted demos are fine); latency of library retrieval is prohibitive
- ACE: single-run tasks with no historical signal; context window is a hard constraint with no headroom

---

## Citations

- Yao, S. et al. (2022). ReAct: Synergizing Reasoning and Acting in Language Models. arXiv:2210.03629
- Gao, L. et al. (2022). PAL: Program-aided Language Models. arXiv:2211.10435
- Shinn, N. et al. (2023). Reflexion: Language Agents with Verbal Reinforcement Learning. arXiv:2303.11366
- Paranjape, B. et al. (2023). ART: Automatic multi-step reasoning and tool-use for large language models.
  arXiv:2303.09014
- Zhang, Q. et al. (2025). Agentic Context Engineering: Evolving Contexts for Self-Improving Language Models.
  arXiv:2510.04618. ICLR 2026.
