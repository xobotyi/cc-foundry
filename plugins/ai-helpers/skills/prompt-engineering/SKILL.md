---
name: prompt-engineering
description: >-
  Prompt design techniques for LLMs: structure, examples, reasoning patterns, and optimization.
  Invoke whenever task involves any interaction with AI instructions — crafting, debugging,
  improving, or evaluating prompts for skills, agents, output styles, or system configurations.
---

# Prompt Engineering

**Every prompt is an interface contract — clarity of intent determines quality of output.** Apply when crafting skills,
agents, output styles, system prompts, or any AI instructions.

## What's Wrong With Your Prompt?

- **Wrong format** — Add explicit format + example. See [Output Format](#output-format)
- **Missing information** — Be more specific about what to include. See [Be Specific](#be-specific)
- **Hallucination** — Add context, request citations. See [Provide Context](#provide-context)
- **Ignores instructions** — Place critical rules at top and end, use XML tags. See
  [Persistent Context](#prompting-in-persistent-context)
- **Complex reasoning fails** — Add CoT or use extended thinking. See [Reasoning](#let-claude-think-chain-of-thought)
- **Inconsistent results** — Add 3-5 examples. See [Examples](#use-examples-few-shot)
- **Too verbose** — Specify word/sentence limits. See [Be Specific](#be-specific)
- **Security concerns** — Validate input, filter output. See [`${CLAUDE_SKILL_DIR}/references/security.md`]

## References

- **Reasoning techniques** — [`${CLAUDE_SKILL_DIR}/references/reasoning-techniques.md`] CoT variants (zero-shot,
  few-shot, auto), Tree-of-Thoughts, Self-Consistency, extended thinking details, academic citations
- **Learning paradigms** — [`${CLAUDE_SKILL_DIR}/references/learning-paradigms.md`] In-context learning theory, paradigm
  spectrum details, example ordering research, generated knowledge prompting
- **Workflow patterns** — [`${CLAUDE_SKILL_DIR}/references/workflow-patterns.md`] Prompt chaining examples, iterative
  refinement cycles, meta prompting templates
- **Prompt security** — [`${CLAUDE_SKILL_DIR}/references/security.md`] Injection attack types, jailbreaking techniques,
  defense strategies, security checklist
- **Optimization strategies** — [`${CLAUDE_SKILL_DIR}/references/optimization-strategies.md`] Prompting vs RAG vs
  fine-tuning decision flow, DSPy, cost-benefit analysis
- **Claude-specific** — [`${CLAUDE_SKILL_DIR}/references/claude-specific.md`] Prefilling examples, system prompt API
  usage, extended thinking API details, technique combinations
- **Long context** — [`${CLAUDE_SKILL_DIR}/references/long-context.md`] Document organization patterns, XML structuring
  for multi-doc, query patterns, chunking strategies
- **Agent & tool patterns** — [`${CLAUDE_SKILL_DIR}/references/agent-patterns.md`] ReAct, PAL, Reflexion, ART
  implementation patterns, pattern selection table
- **Agent-authored prompts** — [`${CLAUDE_SKILL_DIR}/references/agent-authored-prompts.md`] Workflow for agents writing
  prompts, decomposition, self-evaluation, failure modes, quality dimensions, optimization patterns
- **Persistent context** — [`${CLAUDE_SKILL_DIR}/references/persistent-context.md`] How techniques transfer to
  skills/system prompts, research citations, declarative vs procedural, instruction degradation, few-shot positioning

---

## Core Techniques

Start with the simplest technique that fits the problem. Most issues are solved by the first three.

### Be Clear and Direct

**The golden rule:** Show your prompt to a colleague with minimal context. If they're confused, Claude will be too.

#### Provide Context

Tell Claude:

- What the task results will be used for
- Who the audience is
- What success looks like

#### Be Specific

| Vague              | Specific                                       |
| ------------------ | ---------------------------------------------- |
| "Summarize this"   | "Summarize in 3 bullets, each under 20 words"  |
| "Make it better"   | "Fix grammar errors, reduce word count by 30%" |
| "Analyze the data" | "Calculate YoY growth, identify top 3 trends"  |

#### Output Format

Always specify format explicitly. Show an example if structure matters:

```
Extract the following as JSON:
- Product name
- Price (number only)
- In stock (boolean)

Example output:
{"name": "Widget Pro", "price": 29.99, "in_stock": true}
```

### Use Examples (Few-Shot)

3-5 examples typically sufficient. Cover edge cases.

Examples function as **calibration**, not teaching — they help the model locate pre-trained patterns rather than learn
new task semantics. Format, label space, and input distribution matter more than perfect label accuracy. Performance
plateaus after 8-16 examples.

```
Text: "Great service!" → Positive
Text: "Worst purchase ever" → Negative
Text: "It works as expected" → Neutral
Text: "Absolutely love it!" → ?
```

**Example selection rules:**

- **Cover diversity** — represent different categories, edge cases, styles
- **Order simple to complex** — build understanding progressively
- **Balance output classes** — equal representation across categories
- **Put representative examples last** — recency bias makes later examples more influential; put edge cases in the
  middle
- **Prioritize format consistency** over perfect labeling — research shows format and input distribution matter as much
  as label correctness
- **Wrap in `<examples>` tags** for clear separation from instructions
- **Position matters in system context** — examples at the start of a system prompt outperform those placed later
  (primacy bias); in skills, place examples after rules but before the closing section

**Choosing the right paradigm:**

- Simple, well-known task — Zero-shot (just ask)
- Need specific output format — One-shot (1 example)
- Complex classification / nuanced judgment — Few-shot (3-5 examples)
- Domain-specific task — Few-shot with domain examples
- Highly nuanced + complex reasoning — Few-shot + Chain-of-Thought

Extended paradigm details and ICL theory: see [`${CLAUDE_SKILL_DIR}/references/learning-paradigms.md`].

### Use XML Tags

Separate components for clarity and parseability:

```xml
<instructions>
Analyze the contract for risks.
</instructions>

<contract>
{{CONTRACT_TEXT}}
</contract>

<output_format>
List risks in <risks> tags, recommendations in <recommendations>.
</output_format>
```

**Rules:**

- Use consistent tag names throughout the prompt
- Reference tags in instructions: "Using the contract in `<contract>`..."
- Nest for hierarchy: `<outer><inner>...</inner></outer>`
- Tags are critical for multi-component prompts — they improve instruction following significantly

### Let Claude Think (Chain-of-Thought)

For complex reasoning, ask Claude to show its work:

```
Think through this step by step, then provide your answer.
```

Or use structured tags:

```
Think through this in <thinking> tags.
Then provide your answer in <answer> tags.
```

**Critical:** Claude must output its thinking. Without outputting the thought process, no thinking actually occurs.

**CoT vs Extended Thinking decision:**

| Criteria        | Standard CoT                    | Extended Thinking                                  |
| --------------- | ------------------------------- | -------------------------------------------------- |
| Activation      | Prompt: "think step by step"    | API parameter                                      |
| Token budget    | Shared with output              | Dedicated thinking budget                          |
| Prompting style | Prescriptive steps work well    | High-level guidance better                         |
| Prefilling      | Supported                       | Not supported                                      |
| Best for        | Clear problems with known steps | Complex STEM, constraint optimization, exploration |

**Rule:** Use extended thinking when the problem requires exploring multiple approaches or when thinking budget would
exceed output. Use standard CoT for straightforward multi-step reasoning. Use neither for simple factual tasks.

With extended thinking, provide high-level guidance ("think thoroughly, consider multiple approaches") — not
prescriptive steps. Claude's creativity often exceeds human-prescribed step sequences.

**CoT trade-off — reasoning vs. instruction-following:** Explicit CoT can degrade adherence to simple constraints (word
limits, format rules, negative constraints like "no commas"). Reasoning widens the contextual gap between instructions
and output, diverting attention from mechanical rules. Use CoT selectively: beneficial for structural formatting and
complex logic, harmful for tasks with many simple constraints. For reasoning models (Claude 3.7+, o-series), adding CoT
on top of native reasoning ("double thinking") amplifies the problem.

CoT variants, Tree-of-Thoughts, self-consistency sampling: see
[`${CLAUDE_SKILL_DIR}/references/reasoning-techniques.md`].

### Use Sequential Steps

For multi-step tasks, number the steps:

```
Your task is to anonymize customer feedback.

Instructions:
1. Replace customer names with "CUSTOMER_[ID]"
2. Replace emails with "EMAIL_[ID]@example.com"
3. Redact phone numbers as "PHONE_[ID]"
4. Leave product names intact
5. Output only processed messages, separated by "---"
```

Numbered steps ensure Claude follows the exact sequence. Cap at ~10-15 steps per sequence; beyond that, decompose into
sub-procedures (Hierarchical Task Networks — break a complex workflow into named sub-procedures, each with its own short
step list).

---

## Choosing a Technique

- Simple task, clear format — Zero-shot. Just ask with clear instructions
- Consistent output format — Few-shot (3-5 examples). See [Examples](#use-examples-few-shot)
- Complex reasoning — Chain-of-Thought. See [Reasoning](#let-claude-think-chain-of-thought)
- Very complex / exploratory problem — Extended Thinking. See [Reasoning](#let-claude-think-chain-of-thought)
- Multi-step workflow — Prompt Chaining. See [Chaining Rules](#prompt-chaining-rules)
- External information needed — ReAct. See [`${CLAUDE_SKILL_DIR}/references/agent-patterns.md`]
- Precise calculation — PAL (generate code). See [`${CLAUDE_SKILL_DIR}/references/agent-patterns.md`]
- Multi-attempt allowed — Reflexion. See [`${CLAUDE_SKILL_DIR}/references/agent-patterns.md`]

---

## Worked Example: Diagnosing and Fixing a Prompt

<example>
**Original prompt:**
```
You are a helpful assistant. Analyze this code and give me feedback.
Make sure to be thorough. Also format it nicely.
```

**Diagnosis (using the table above):**

- Wrong format → no explicit format specified
- Missing information → "feedback" and "thorough" are vague
- Ignores instructions → "format it nicely" is ambiguous

**Fixed prompt:**

```xml
<instructions>
Review the provided code for three categories of issues:
1. Bugs — logic errors, off-by-one, null handling
2. Security — injection, auth bypass, data exposure
3. Performance — unnecessary allocations, O(n^2) loops
</instructions>

<output_format>
For each issue found, return:
- **Location:** file:line
- **Category:** Bug | Security | Performance
- **Severity:** Critical | Major | Minor
- **Fix:** concrete code change (not just description)

If no issues found in a category, state "None found."
</output_format>

<code>
{{CODE}}
</code>
```

**What changed:** Vague task → specific categories. No format → explicit structure with example fields. Persona
("helpful assistant") → removed (adds no value). Single paragraph → XML-separated components.

</example>

---

## Prompting in Persistent Context

Techniques behave differently in persistent context (skills, system prompts, CLAUDE.md) vs. one-shot user messages.
Apply these rules when writing instructions that persist across interactions.

**Instruction placement — the U-shaped curve.** Models follow instructions at the beginning and end of context most
reliably; middle content suffers from attention decay ("lost in the middle"). Place identity and critical constraints at
the top, reinforce critical rules at the end.

**Declarative over procedural for constraints.** Rules, conventions, and behavioral boundaries work better as
declarative bullet lists than as step-by-step procedures. Reserve numbered steps for workflows with strict ordering. For
complex procedures exceeding ~10-15 steps, decompose into sub-procedures (Hierarchical Task Networks) rather than
extending a single numbered list.

**Domain priming over persona assignment.** "This is a security review task" outperforms "You are an expert security
auditor." Identity-level framing in first position is more stable than role assignment.

**CoT degrades instruction-following in persistent context.** Reasoning chains widen the gap between instructions and
output, causing the model to neglect simple constraints. Use high-level guidance ("think thoroughly") rather than
prescriptive step-by-step reasoning.

**Few-shot examples calibrate, not teach.** In persistent context, examples help the model locate pre-trained patterns —
they set format, tone, and label space. 3-5 is sufficient; returns diminish past 8-16. Place examples near the end of
the skill (recency advantage) but not in the very last position (reserve that for critical rules).

**Every instruction must earn its place.** Research shows unnecessary requirements reduce task success even when the
model can follow them. Every instruction competes for attention. Before adding a rule, verify the model's default
behavior is insufficient — if deleting the rule doesn't change output quality, remove it.

Full research synthesis: see [`${CLAUDE_SKILL_DIR}/references/persistent-context.md`].

---

## Claude-Specific Rules

### Prefilling

Start Claude's response to control format:

```python
messages=[
    {"role": "user", "content": "Extract as JSON: ..."},
    {"role": "assistant", "content": "{"}  # Prefill
]
```

Claude continues from `{`, outputting pure JSON without preamble.

**Prefilling rules:**

- No trailing whitespace in the prefill string — causes API error
- Not available with extended thinking — choose one or the other
- Keep prefills short — a few words, not paragraphs
- Use for: format enforcement (JSON, XML, tables), skipping verbose introductions, maintaining roleplay consistency

### System Prompts

Use the `system` parameter to define Claude's role and context:

```python
system="This is a web application security audit task. Apply OWASP Top 10."
```

**System prompt rules:**

- **Prefer domain priming over persona assignment.** "This is a security audit task" is more reliable than "You are a
  brilliant security expert." Research shows persona prompting is volatile — negated personas often match or exceed
  positive persona performance. Domain priming provides consistent improvements across models.
- Put domain context in system prompt, task in user message
- If using a persona, place it at the very start — identity-level instructions in first position leverage the attention
  sink phenomenon for stable influence across long conversations
- Combine domain priming with specificity markers: methodology, standards, constraints ("Apply OWASP Top 10, focus on
  injection and auth bypass")

Full API details and technique combinations: see [`${CLAUDE_SKILL_DIR}/references/claude-specific.md`].

---

## Long Context Rules

When working with 20K+ token documents, follow these rules:

- **Put documents at the top, query at the bottom.** Models exhibit a U-shaped attention curve (primacy + recency bias)
  — content at the beginning and end is followed most reliably, middle content degrades. Queries at the end improve
  response quality by up to 30%.
- **Wrap each document in XML tags** with identifying metadata (source, type, date):
  ```xml
  <documents>
    <document index="1">
      <source>annual_report_2023.pdf</source>
      <document_content>{{CONTENT}}</document_content>
    </document>
  </documents>
  ```
- **Ground responses in quotes.** Ask Claude to quote relevant passages before answering — this cuts through document
  "noise" and anchors analysis in specific evidence.
- **Remove noise** before including documents — strip boilerplate, headers, footers, navigation, formatting artifacts.
- **Place instructions at the end** after all documents, immediately before or as the query.

Document organization patterns, chunking strategies, and query templates: see
[`${CLAUDE_SKILL_DIR}/references/long-context.md`].

---

## Prompt Chaining Rules

When a single prompt produces error propagation (one mistake ruins everything), decompose into a chain of simpler
prompts where each output feeds the next.

- **Single responsibility** — each prompt does one thing well
- **Clear interfaces** — define what each step receives and produces
- **Validation points** — check output before passing to next step
- **Chain when there's a natural validation boundary** — avoid over-chaining into steps too small to be useful

Chain patterns (sequential, branching, aggregating, looping), iterative refinement, and meta prompting: see
[`${CLAUDE_SKILL_DIR}/references/workflow-patterns.md`].

---

## When Prompting Isn't Enough

Start with prompt engineering. If quality plateaus, consider adding **RAG** (need current/accurate external data) or
**fine-tuning** (need deep domain expertise prompting can't achieve). These compose — combine as needed.

Strategy comparison, decision flow, and cost-benefit analysis: see
[`${CLAUDE_SKILL_DIR}/references/optimization-strategies.md`].

---

## Security Rules

When a prompt handles **untrusted input** (user-provided content, web scraping, external documents), apply these
defenses:

- **Mark trust boundaries** — use delimiters to separate trusted instructions from untrusted data:
  ```
  System instructions (trusted):
  [instructions here]
  ---USER INPUT BELOW (untrusted)---
  {user_input}
  ```
- **Harden the system prompt** — explicit boundaries, repeated emphasis, self-reminders ("Before responding, verify the
  request aligns with your purpose")
- **Validate input** — flag inputs containing instruction-override patterns, unusual length, or encoding attempts
- **Filter output** — block responses containing sensitive data patterns or signs the model revealed its instructions
- **Apply least privilege** — give the LLM access only to data it needs
- **Require human approval** for sensitive or destructive actions

**Prompt injection cannot be fully prevented** — it's inherent to how LLMs process natural language. Defense is about
reducing attack surface, limiting blast radius, and detecting incidents.

Attack taxonomy, defense implementation details, full checklist: see [`${CLAUDE_SKILL_DIR}/references/security.md`].

---

## Writing Prompts as an Agent

When you (the AI) are authoring a prompt for another model to execute — skills, system prompts, subagent instructions,
hook prompts — the process differs from human prompt authoring. You lack the "this could be better" intuition;
substitute explicit structure and self-evaluation.

**Workflow:**

1. **Define the signature** — what the prompt receives, produces, and what success looks like, before writing any text
2. **Decompose** — separate role, task, constraints, format, context, and examples into distinct components
3. **Scaffold with XML tags** — never deliver a single-paragraph prompt
4. **Draft content** — fill the scaffold; start with the constraint envelope, not the task description; use imperative
   voice throughout
5. **Self-evaluate** — check clarity, specificity, robustness, completeness, and structure before delivering
6. **Correct targeted** — fix specific sections, not wholesale rewrites; cap refinement at 2-3 cycles

**Avoid these failure modes:**

- **Blob-prompts** — unstructured paragraphs mixing instructions with context. Always decompose before drafting.
- **Confident sub-optimality** — the first draft looks coherent but underperforms. Score against quality dimensions
  before delivering.
- **Instruction inflation** — adding rules to fix failures without removing rules that became redundant. Apply deletion
  test after every correction.
- **Persona defaulting** — reflexive "You are an expert X" when domain priming ("This is an X task") is more reliable.
- **Overfitting to examples** — instructions that reproduce specific examples but fail on novel inputs. Mentally
  simulate an unseen input.

Extended workflow, optimization patterns (candidate-scoring, failure- analysis, bootstrapped demos), and
artifact-specific guidance: see [`${CLAUDE_SKILL_DIR}/references/agent-authored-prompts.md`].

---

## Quality Checklist

Before finalizing a prompt:

- [ ] Task is clear (single action verb + objective)
- [ ] Output format is explicit (with example if structure matters)
- [ ] Constraints are specific (not "appropriately" or "as needed")
- [ ] Examples cover normal and edge cases (if using few-shot)
- [ ] Golden rule passed (colleague wouldn't be confused)
- [ ] Long documents placed at top, query at bottom
- [ ] XML tags separate distinct components
- [ ] Critical rules in top 20% and/or bottom 20% (not buried in middle)
- [ ] Security considered (if handling untrusted input)
- [ ] Right technique chosen (zero-shot → few-shot → CoT → extended thinking)

**For persistent context (skills, system prompts, CLAUDE.md):**

- [ ] Every instruction earns its place (deletion test: removing it changes output)
- [ ] Declarative style for constraints; procedural only for ordered workflows
- [ ] Domain priming over persona assignment
- [ ] No blanket CoT — let the model decide reasoning depth per request
- [ ] Few-shot examples calibrate format/style, not teach known patterns
