# Prompting in Persistent Context

How standard prompting techniques behave when embedded in system prompts, skills (SKILL.md), CLAUDE.md files, and other
persistent loaded context — vs. one-shot user messages where most prompt engineering guidance assumes you're operating.

## Contents

- [Why Persistent Context Is Different](#why-persistent-context-is-different)
- [Technique Transfer Rules](#technique-transfer-rules)
- [Instruction Degradation](#instruction-degradation)
- [Format and Template Sensitivity](#format-and-template-sensitivity)
- [Declarative vs Procedural Instructions](#declarative-vs-procedural-instructions)
- [Instruction Placement Strategy](#instruction-placement-strategy)
- [The Minimalism Principle](#the-minimalism-principle)

---

## Why Persistent Context Is Different

System prompts and skills occupy a privileged position in the instruction hierarchy: system > user > tool. Models are
trained (via RLHF) to treat system-level context as the ultimate source of truth, overriding conflicting user-level
information. This privilege changes how every technique works:

- **Persistence amplifies both benefits and harms.** A good rule helps on every request; a bad rule hurts on every
  request. One-shot prompts fail gracefully — persistent instructions fail repeatedly.
- **Context accumulates.** Skills load alongside conversation history, other skills' metadata, and tool results. A
  400-line skill that's excellent in isolation may compete for attention with 50K tokens of surrounding context.
- **Instruction drift is real.** In multi-turn interactions, models gradually de-prioritize initial instructions as
  conversation history grows. Research shows drift begins within ~8 turns.

---

## Technique Transfer Rules

### Few-Shot Examples

**Transfer:** Effective but position-sensitive and interaction-dependent. SKILL.md covers practical rules (3-5 examples,
ordering, placement). This section provides the research findings behind those rules.

**Research findings:**

- Examples at the **start of a system prompt** consistently outperform those placed later — primacy bias is strong and
  persistent across model families.
- Examples **strengthen role-oriented prompts** (identity framing like "you are a safe assistant") by reinforcing the
  role through demonstration.
- Examples **weaken task-oriented prompts** (explicit task instructions) by diverting attention from the instructions
  themselves — up to 21% degradation in one study.
- For large code-specialized models, few-shot examples can **degrade performance** relative to zero-shot when the model
  already has strong priors for the domain (e.g., Java code generation). Re-anchor with high-constraint specificity if
  using examples anyway.
- **Order sensitivity** is fundamental and does not diminish with model scale. The specific sequence of examples can
  swing performance from near-SOTA to random-guess levels.

**Key papers:** "Where to show Demos in Your Prompt" (Cobbina & Zhou); "How Few-shot Demonstrations Affect Prompt-based
Defenses" (multiple authors); "Rethinking the Role of Demonstrations" (Min et al.)

### Chain-of-Thought

**Transfer:** Mixed — frequently degrades instruction-following in persistent context. SKILL.md covers practical rules
(no blanket CoT, high-level guidance, constraint re-statement). This section provides the research.

**Research findings:**

- Explicit CoT in a system prompt **degrades instruction adherence** by widening the "contextual gap" between
  instructions and output. Longer reasoning chains increase the distance, making constraint retention harder.
- CoT **diverts "constraint attention"** — the model over-focuses on high-level content planning and neglects simple
  mechanical rules (word limits, format requirements, negative constraints like "no commas").
- Applying CoT prompts to models with native reasoning (Claude 3.7+, GPT o-series, DeepSeek-R1) causes "double thinking"
  — over-analysis that amplifies instruction-following failures rather than mitigating them.
- CoT **does help** with structural/formatting adherence (valid JSON, XML tags, markdown syntax) and lexical precision
  (rare characters, specific word counts). These are cases where reasoning acts as a checklist.
- Structuring reasoning as **discrete numbered steps** (a "Thought MDP") enables models to self-localize errors and
  backtrack — 20-40% self-correction lift vs. unstructured CoT.

**Key papers:** "When Thinking Fails" (Li et al.); "Scaling Reasoning, Losing Control" (multiple authors); "Diminishing
Returns of CoT" (Meincke, Mollick et al.)

### XML Structuring

**Transfer:** Highly effective — considered best practice for persistent context.

- XML tags act as **structural anchors** that reduce misinterpretation when multiple instructions, examples, and
  variable inputs coexist in long system prompts.
- Tags help models **distinguish identity from content**, preventing "impersonation" attacks where user messages attempt
  to override system-level privilege.
- Consistent, descriptive tag names across the prompt improve both instruction-following and robustness to adversarial
  inputs.

**Practical rules for skills:**

- Always use XML tags to separate instructions, constraints, examples, and output format specifications
- Use `<instructions>`, `<constraints>`, `<examples>`, `<output_format>` as standard tag vocabulary
- Nest tags for hierarchy when skills have complex structure
- Reference tags in instructions ("Follow the constraints in `<constraints>`...") to create explicit attention links

### Role Prompting (Personas)

**Transfer:** Volatile — domain priming is more reliable than persona assignment. SKILL.md covers practical rules
(domain priming over persona, identity framing placement). This section provides the research.

**Research findings:**

- Assigning expert roles ("You are a brilliant mathematician") often **interferes with reasoning** or provides
  inconsistent gains. Domain priming ("This is a mathematics task") provides consistent improvements.
- **Negated personas** ("You are NOT an expert") often match or exceed positive persona performance — revealing
  fundamental instability in persona-based approaches.
- **Identity-level instructions** ("who you are") in persistent context exhibit a stronger "initial position advantage"
  and more stable influence than task-level instructions ("what to do"). If using a persona, place it at the very first
  position in the system prompt.
- Even when models generate their own "optimal" personas, the underlying instability persists. Model-generated domain
  priming is more reliable than model-generated personas.

**Key papers:** "'You are a brilliant mathematician' Does Not Make LLMs Act Like One" (Bai, Holtzman, Tan)

### Sequential Steps

**Transfer:** Highly effective for agentic workflows, with a ceiling. SKILL.md covers practical rules (numbered steps
for ordering, bullets for rules, 10-15 step cap). This section provides the research.

**Research findings:**

- Decomposing complex goals into **totally ordered subtasks** (Hierarchical Task Networks) improves success rates by
  reducing context complexity at each decision point. Can enable a 20B model to outperform a 120B baseline.
- Framing reasoning as **discrete steps** allows models to self-localize errors and backtrack — a capability that fails
  in unstructured reasoning.
- Write steps in **third-person imperative**: "Extract the text..." rather than "I will extract..." or "You should
  extract..."
- **Performance collapses beyond ~10-15 steps** in a single sequence. Decompose via HTN: break complex workflows into
  sub-procedures, each with its own numbered step list.

**Key papers:** "Procedural Knowledge Improves Agentic LLM Workflows" (Hsiao et al.); "Structure Enables Effective
Self-Localization of Errors in LLMs" (Samanta et al.)

---

## Instruction Degradation

Instruction-following degrades as context grows. This is not a retrieval problem — it persists even when models can
perfectly retrieve all relevant information.

### The U-Shaped Attention Curve

Models exhibit **primacy bias** (better adherence at the start) and **recency bias** (better adherence at the end).
Content in the middle suffers — the "lost in the middle" phenomenon. Performance degradation ranges from 13.9% to 85% as
input length increases, depending on task and model.

### Instruction Drift

In multi-turn conversations, models gradually de-prioritize initial instructions. System prompt adherence erodes as
conversation history grows. Research indicates drift begins within ~8 turns.

### The Sheer Length Effect

Adding tokens to context degrades instruction-following even when those tokens are whitespace or masked entirely. The
degradation is from length itself, not from distracting content. This means every line in a skill has a cost — even if
the model reads it correctly, its presence reduces attention available for other instructions.

**Formatting tokens are not free.** Human-readable whitespace (indentation, blank lines, decorative separators) that
aids human comprehension consumes real tokens with no corresponding LLM comprehension benefit. Research across 10 LLMs
and 4 programming languages shows code formatting elements (indentation, newlines) add an average of 24.5% input tokens
with negligible performance impact — stripping them loses nothing for the model while cutting cost. In persistent
context where token budget directly affects attention quality, over-formatted prompts pay a measurable degradation
penalty.

### Working Memory Overload

Adding too many constraints overwhelms the model's "working memory," causing incidental errors where relevant clauses
are omitted or applied inconsistently. More guardrails does not monotonically improve compliance.

---

## Format and Template Sensitivity

Prompt format (the structural template wrapping content) is a distinct variable from prompt content. Research shows
format alone can swing model performance by up to 40% on the same task with the same underlying instructions.

### Format Performance by Task Type

- **Natural language reasoning** — plain prose and Markdown perform similarly; JSON/YAML add marginal parsing overhead
  with no reasoning benefit
- **Code generation** — format sensitivity is highest; GPT-3.5-class models show up to 40% variance across plain text,
  Markdown, JSON, and YAML templates on the same task
- **Translation** — moderate sensitivity; structured formats (JSON, YAML) impose syntax overhead that can compete with
  content attention
- **Instruction-heavy prompts** — Markdown headers and XML tags outperform unstructured prose by creating explicit
  section boundaries the model can anchor to

### Model-Scale Interaction

Format sensitivity is strongly inversely correlated with model scale:

- Smaller/older models (GPT-3.5-class, 7B-13B range) — high sensitivity; format choice can dominate content quality
- Larger models (GPT-4-class, 70B+) — substantially more robust; format matters less than content
- **Implication for skills:** Skills targeting Claude Haiku or other smaller models need more careful format selection
  than those targeting Sonnet/Opus. Don't assume robustness.

### Recommended Format Hierarchy for Persistent Context

Order of preference for system prompts and skills, highest to lowest reliability:

- XML tags (structured sections, explicit boundaries) — best for complex multi-section skills
- Markdown headers + bullet lists — best for mid-complexity skills; good attention anchors
- Plain prose — only for short, single-purpose prompts where structure adds overhead
- JSON/YAML — avoid in instruction context; fine for data payloads, not for instruction framing

### What This Means for Skill Authoring

- **Don't over-format.** Decorative structure (nested sub-bullets, elaborate dividers, heavy indentation) adds tokens
  without adding semantic anchors. Human readability and LLM parseability diverge.
- **Whitespace is not neutral.** Blank lines between every bullet, deep indentation, and spacer lines all consume
  tokens. In a 200-line skill loaded into a 50K-token context, formatting bloat compounds instruction degradation.
- **Test format changes as you would content changes.** Reformatting a skill (e.g., converting a table to a KV list, or
  adding XML tags) can measurably change compliance rates. Treat format as a tunable parameter.
- **Consistency beats elegance.** A consistent, slightly verbose format the model reliably parses outperforms a clean
  format that introduces ambiguity.

**Key papers:** "Does Prompt Formatting Have Any Impact on LLM Performance?" (Rungta et al., arXiv:2411.10541); "The
Hidden Cost of Readability: How Code Formatting Silently Consumes Your LLM Budget" (Pan et al., arXiv:2508.13666)

---

## Declarative vs Procedural Instructions

Research distinguishes **declarative knowledge** ("knowing that" — facts, rules, constraints) from **procedural
knowledge** ("knowing how" — step-by-step workflows, strategies).

### When to Use Each

- Behavioral constraints, conventions — **Declarative**. Models utilize factual constraints more reliably across varied
  inputs
- Safety guardrails, formatting rules — **Declarative**. Explicit rules are more robust for enforcing boundaries
- Simple sequential workflows — **Procedural**. Clear strategy is highly effective for reproducible logical paths
- Complex multi-step agent tasks — **Procedural (HTN)**. Task decomposition prevents looping and reduces per-step
  complexity
- Complex logic / reasoning — **Declarative**. Models struggle to follow intricate multi-step plans; facts are more
  reliably utilized
- Broad specialized domains — **Declarative**. Knowledge hints outperform process hints for most STEM, humanities, legal
  tasks

### The Hybrid Pattern

Professional-grade skills should use **declarative framing at the top level** (identity, conventions, constraints) with
**procedural steps reserved for specific workflow sections**, offloaded to sub-procedures when complexity exceeds ~10
steps.

```markdown
# My Skill                          ← Declarative: identity, philosophy

## Conventions                      ← Declarative: bullet-list rules
- Use ESM for all imports
- Prefer `node:` prefix for builtins
- ...

## Workflow                         ← Procedural: numbered steps
1. Read the configuration file
2. Validate against the schema
3. Generate output files

## Critical Rules                   ← Declarative: reinforcement at end
- Never skip validation
- Always confirm before destructive operations
```

### Key Finding

Declarative knowledge provides greater performance benefits than procedural knowledge in the majority of tasks. Larger
models show significantly higher improvement from external declarative information than from procedural hints.
Procedural knowledge outperforms declarative only in reasoning tasks with simple logic (elementary arithmetic, basic
commonsense).

**Key papers:** "Meta-Cognitive Analysis: Evaluating Declarative and Procedural Knowledge" (Li et al.); "Procedural
Knowledge Improves Agentic LLM Workflows" (Hsiao et al.)

---

## Instruction Placement Strategy

Based on the U-shaped attention curve and instruction hierarchy research, place content in this order within a skill or
system prompt:

```
┌─────────────────────────────────────┐
│ 1. Identity / domain priming        │  ← Primacy zone (highest attention)
│ 2. Critical constraints             │
├─────────────────────────────────────┤
│ 3. Route-to-reference table         │  ← Middle zone (lower attention)
│ 4. Detailed rules by topic          │
│ 5. Examples                         │
├─────────────────────────────────────┤
│ 6. Reinforced critical rules        │  ← Recency zone (high attention)
│ 7. Quality checklist                │
└─────────────────────────────────────┘
```

**Dual-placement strategy:** For rules that absolutely must be followed, state them near the top AND reinforce at the
end. This exploits both primacy and recency bias. Use different phrasing to avoid appearing redundant — frame as a
principle at the top, as a checklist item at the bottom.

**Avoid the middle for critical rules.** If a rule is important enough to enforce, place it in the top 20% or bottom 20%
of the document. Middle placement is appropriate for detailed topic rules, lookup tables, and examples — content that's
valuable when the agent reads it on-demand but doesn't need persistent attention.

---

## The Minimalism Principle

Research on AGENTS.md files shows a counterintuitive result: repository-level instructions can **reduce task success
rates** while increasing inference cost by 20%+. The effect depends on instruction type:

- **Shortcut instructions** (repo structure, navigation hints) → improved efficiency. The agent spent less time
  exploring.
- **Checklist instructions** (additional requirements, broader scope) → reduced success. The agent got burdened with
  secondary objectives.

**The rule:** Every instruction must earn its place. Before adding a rule to a skill, verify that the model's default
behavior is insufficient. If deleting the rule doesn't change output quality, remove it. Instructions that duplicate the
model's existing capabilities add attention cost without value.

This does not mean "minimize everything" — skills exist precisely to add rules the model doesn't know. It means: don't
add rules for things the model already does well. Audit existing skills by asking: "if I delete this rule, does output
quality measurably change?"

**Formatting as a minimalism concern:** Decorative whitespace, redundant blank lines, and indentation-heavy structure
are invisible instruction budget leaks. A skill with 30% formatting overhead is effectively 30% longer than it needs to
be — pushing content further into the middle-zone attention penalty. Prefer compact, well-anchored structure over
visually polished but token-heavy layout.

**Key papers:** "Impact of AGENTS.md on AI Coding Agent Efficiency" (multiple authors); "Do Context Files Help Coding
Agents?" (multiple authors); "Does Prompt Formatting Have Any Impact on LLM Performance?" (Rungta et al.,
arXiv:2411.10541); "The Hidden Cost of Readability" (Pan et al., arXiv:2508.13666)
