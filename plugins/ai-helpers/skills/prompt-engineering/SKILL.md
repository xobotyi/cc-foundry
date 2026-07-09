---
name: prompt-engineering
description: "Prompt design techniques for LLMs: structure, examples, reasoning patterns, and optimization. Invoke whenever task involves any interaction with AI instructions — crafting, debugging, improving, or evaluating prompts for skills, agents, output styles, or system configurations."
---

# Prompt Engineering

**Every prompt is an interface contract — clarity of intent determines quality of output.** Apply when crafting skills,
agents, output styles, system prompts, or any AI instructions.

## Read first when

- **You are writing a prompt for another model** (skill, subagent, system prompt, agent instruction, output style) →
  load [`${CLAUDE_SKILL_DIR}/references/agent-authored-prompts.md`] **BEFORE drafting**. Agent-authored prompts have
  distinct failure modes (over-specification, context leakage, ambiguous output contracts, silent degradation across
  pipeline stages) that the diagnostic table below does NOT cover. The summary in
  [Writing Prompts as an Agent](#writing-prompts-as-an-agent) is incomplete — the reference holds the workflow.

## What's Wrong With Your Prompt?

- **Wrong format** — add explicit format + example. See [Output Format](#output-format)
- **Missing information** — be more specific about what to include. See [Be Specific](#be-specific)
- **Hallucination** — add context, request citations. See [Provide Context](#provide-context)
- **Ignores instructions** — place critical rules at top and end, use XML tags. See
  [Persistent Context](#prompting-in-persistent-context)
- **Complex reasoning fails** — use extended thinking or CoT. See [Reasoning](#reasoning)
- **Inconsistent results** — add 3-5 examples. See [Examples](#use-examples-few-shot)
- **Too verbose** — specify word/sentence limits. See [Be Specific](#be-specific)
- **Security concerns** — validate input, filter output. See [`${CLAUDE_SKILL_DIR}/references/security.md`]

## References

- **Reasoning techniques** — [`${CLAUDE_SKILL_DIR}/references/reasoning-techniques.md`] CoT variants (zero-shot,
  few-shot, auto), Tree-of-Thoughts, Self-Consistency, adaptive thinking, reasoning models (GPT-5.x), CRANE constrained
  reasoning, academic citations
- **Learning paradigms** — [`${CLAUDE_SKILL_DIR}/references/learning-paradigms.md`] ICL theory, zero/few-shot
  techniques, example selection research, generated knowledge prompting, active prompting
- **Workflow patterns** — [`${CLAUDE_SKILL_DIR}/references/workflow-patterns.md`] Prompt chaining topologies, iterative
  refinement, meta prompting, APE, automated optimization survey
- **Prompt security** — [`${CLAUDE_SKILL_DIR}/references/security.md`] OWASP Top 10 for LLM 2025, injection defense,
  agentic pipeline security, threat modeling, defense patterns
- **Optimization strategies** — [`${CLAUDE_SKILL_DIR}/references/optimization-strategies.md`] Promptware engineering
  lifecycle, DSPy declarative optimization, RAG integration, manual iteration discipline
- **Claude-specific** — [`${CLAUDE_SKILL_DIR}/references/claude-specific.md`] Adaptive thinking, effort parameter,
  prefill migration, mid-conversation system messages, prompt caching (automatic + explicit, 1-hour TTL), structured
  outputs, context windows, technique combinations
- **Model behavior** — [`${CLAUDE_SKILL_DIR}/references/model-behavior.md`] Per-model behavioral prompting: the
  migration trap (over-prescriptive prompts overtrigger on newer models), cross-model shifts (literal instruction
  following, effort as primary lever, tool triggering), Claude Fable 5 / Opus 4.8 / Sonnet 5 steering patterns, GPT-5.x
  profile
- **Long context** — [`${CLAUDE_SKILL_DIR}/references/long-context.md`] Document organization patterns, XML structuring
  for multi-doc, chunking strategies, context rot mitigation
- **Agent & tool patterns** — [`${CLAUDE_SKILL_DIR}/references/agent-patterns.md`] ReAct, PAL, Reflexion, ART, ACE
  implementation patterns, failure modes, pattern selection
- **Agent-authored prompts** — [`${CLAUDE_SKILL_DIR}/references/agent-authored-prompts.md`] Agents writing prompts:
  decomposition workflow, quality dimensions, failure modes, SPL pattern, pipeline rules
- **Persistent context** — [`${CLAUDE_SKILL_DIR}/references/persistent-context.md`] Technique transfer to skills/system
  prompts, instruction degradation research, format sensitivity, declarative vs procedural, U-shaped attention,
  minimalism principle
- **Structured data formats** — [`${CLAUDE_SKILL_DIR}/references/structured-data-formats.md`] Format benchmarks (KV vs
  table vs YAML vs JSON), TOON verdict, output format restrictions, CFPO, format selection rules
- **Context engineering** — [`${CLAUDE_SKILL_DIR}/references/context-engineering.md`] The discipline beyond prompts:
  context types, quality principles, retrieval strategies, management patterns, layered architecture

Read the relevant reference before proceeding.

---

## Core Techniques

Start with the simplest technique that fits the problem. Most issues are solved by the first three.

### Be Clear and Direct

**The golden rule:** show your prompt to a colleague with minimal context. If they're confused, Claude will be too.

#### Provide Context

Tell Claude:

- What the task results will be used for
- Who the audience is
- What success looks like

#### Be Specific

- "Summarize this" → "Summarize in 3 bullets, each under 20 words"
- "Make it better" → "Fix grammar errors, reduce word count by 30%"
- "Analyze the data" → "Calculate YoY growth, identify top 3 trends"

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

3-5 examples typically sufficient. Cover edge cases. Format consistency and input distribution matter more than perfect
label accuracy. Performance plateaus after 8-16 examples.

**Example selection rules:**

- Cover diversity — represent different categories, edge cases, styles
- Order simple to complex — build understanding progressively
- Balance output classes — equal representation across categories
- Put representative examples last — recency bias makes later examples more influential
- Prioritize format consistency over perfect labeling
- Wrap in `<examples>` tags for clear separation
- In system context, examples at the start outperform those placed later (primacy bias)

**Choosing the right paradigm:**

- Simple, well-known task → zero-shot (just ask)
- Need specific output format → one-shot (1 example)
- Complex classification / nuanced judgment → few-shot (3-5 examples)
- Domain-specific task → few-shot with domain examples
- Highly nuanced + complex reasoning → few-shot + CoT

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

- Use consistent tag names throughout the prompt
- Reference tags in instructions: "Using the contract in `<contract>`..."
- Nest for hierarchy: `<outer><inner>...</inner></outer>`
- Critical for multi-component prompts — significantly improves instruction following

### Reasoning

For complex reasoning, ask Claude to show its work:

```
Think through this in <thinking> tags.
Then provide your answer in <answer> tags.
```

**Critical:** Claude must output its thinking. Without outputting the thought process, no thinking actually occurs.

**Reasoning models (Claude adaptive thinking, OpenAI GPT-5.x):**

- These models reason internally — do NOT add "think step by step" (it's redundant and may degrade quality)
- Prefer general instructions ("think thoroughly") over prescriptive step-by-step plans
- Use `<thinking>` tags in few-shot examples to demonstrate desired reasoning style
- Ask for self-verification: "Before finishing, verify your answer against [criteria]"
- Use the `effort` parameter to control reasoning depth, not prompt-level CoT

**Standard models (no native reasoning):**

- Use explicit CoT when the problem requires multi-step reasoning
- Use extended thinking when the problem requires exploring multiple approaches
- Use neither for simple factual tasks

**CoT trade-off:** helpful for structural formatting and complex logic; harmful for tasks with many mechanical
constraints (word limits, format rules).

Detailed techniques, ToT, self-consistency: see [`${CLAUDE_SKILL_DIR}/references/reasoning-techniques.md`].

### Use Sequential Steps

For multi-step tasks, number the steps:

```
1. Replace customer names with "CUSTOMER_[ID]"
2. Replace emails with "EMAIL_[ID]@example.com"
3. Redact phone numbers as "PHONE_[ID]"
4. Leave product names intact
5. Output only processed messages, separated by "---"
```

Cap at ~10-15 steps per sequence; beyond that, decompose into sub-procedures (Hierarchical Task Networks).

---

## Structured Data in Prompts

Format choice measurably affects LLM accuracy — up to 16pp between best and worst formats on identical content.

- **Key-value lists** for lookup/routing data where entries are independent — +8.8pp accuracy over tables
- **Markdown tables** only for genuinely 2D comparisons where cross-criteria scanning IS the point
- **YAML** for deeply nested data (configs, hierarchies) — best accuracy for nested structures
- **Avoid CSV, JSONL, XML for input data** — consistently underperform alternatives

**Test:** if removing a column would lose comparative meaning → table. Otherwise → KV list.

**Output format restrictions degrade reasoning.** Use structured output only when downstream consumers require it;
prefer post-processing free-form output for reasoning-heavy tasks.

Full benchmarks and selection rules: see [`${CLAUDE_SKILL_DIR}/references/structured-data-formats.md`].

---

## Choosing a Technique

- Simple task, clear format → zero-shot with clear instructions
- Consistent output format → few-shot (3-5 examples)
- Complex reasoning → CoT (standard models) or extended thinking (reasoning models)
- Very complex / exploratory → extended thinking with high effort
- Multi-step workflow → prompt chaining. See [`${CLAUDE_SKILL_DIR}/references/workflow-patterns.md`]
- External information needed → ReAct. See [`${CLAUDE_SKILL_DIR}/references/agent-patterns.md`]
- Precise calculation → PAL (generate code). See [`${CLAUDE_SKILL_DIR}/references/agent-patterns.md`]
- Multi-attempt allowed → Reflexion. See [`${CLAUDE_SKILL_DIR}/references/agent-patterns.md`]

---

## Worked Example: Diagnosing and Fixing a Prompt

<example>
**Original prompt:**
```
You are a helpful assistant. Analyze this code and give me feedback.
Make sure to be thorough. Also format it nicely.
```

**Diagnosis:**

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

**What changed:** vague task → specific categories. No format → explicit structure. Persona removed (adds no value).
Single paragraph → XML-separated components.

</example>

---

## Prompting in Persistent Context

Techniques behave differently in persistent context (skills, system prompts, CLAUDE.md) vs. one-shot user messages.

- **Place critical rules at top and end of context.** The U-shaped attention curve makes the middle the worst location.
- **Prefer declarative bullets over numbered procedures** — except when ordering matters; cap sequences at ~10-15 steps.
- **Prime the domain, don't assign a persona.** "This is a security review task" beats "You are an expert auditor."
- **Format swings compliance up to 40%.** XML tags and Markdown headers beat prose; JSON/YAML are for data, not
  instructions.
- **Every instruction must earn its place.** Apply the deletion test: if removing it doesn't change output, remove it.

Full research synthesis: see [`${CLAUDE_SKILL_DIR}/references/persistent-context.md`].

---

## Claude-Specific Rules

### Adaptive Thinking and Effort

Current Claude models (Opus 4.7+, Sonnet 5, Fable 5) use **adaptive thinking** — the only thinking mode; Claude
dynamically determines when and how deeply to reason:

```json
{ "thinking": { "type": "adaptive" }, "output_config": { "effort": "high" } }
```

- **effort levels:** `low`, `medium`, `high` (default), `xhigh` (best for hard coding/agentic work), `max`
- Effort affects all tokens: text, tool calls, and thinking; raise effort rather than prompting around shallow reasoning
- Defaults when `thinking` is omitted: Fable 5 always thinks (omit the param; `disabled` returns 400); Sonnet 5 runs
  adaptive; Opus 4.7/4.8 run without thinking
- `budget_tokens` returns 400 on current models — use effort + adaptive thinking
- Thinking display defaults to `omitted` — set `display: "summarized"` if reasoning is surfaced to users

### Prefilling (removed)

Prefilling a partial `assistant` message returns a 400 on Claude 4.6+ and Fable 5 (legacy models only). Migrate:

- Forcing JSON/schema → structured outputs (`output_config.format`)
- Skipping preamble → system instruction: "Respond directly without preamble"
- Continuing an interrupted response → quote the last text in the user turn and ask to continue

### Prompt Caching

Cache stable context to cut latency and cost. Two modes: automatic (top-level `cache_control`) and explicit (block-level
breakpoints). Key rules:

- Up to 4 breakpoints per request; 5-minute TTL (default) or 1-hour TTL
- Cache read: 0.1x input price. Cache write: 1.25x (5-min) or 2x (1-hour)
- Place breakpoint on the last block that stays identical across requests
- Cache invalidation hierarchy: tools → system → messages

### Structured Outputs

Constrained decoding guaranteeing schema-compliant JSON. Use `output_config.format` for response format or
`strict: true` on tool definitions. Incompatible with citations and prefilling. Grammar applies only to final text
output — thinking is unconstrained.

### Model-Specific Behavior

Behavioral defaults (verbosity, tool eagerness, subagent use, design taste) shift per model release — techniques
transfer, defaults don't. When tuning for a specific model, first remove prior-model scaffolding (it overtriggers on
newer models), then check the model's own prompting guide. Per-model profiles and steering patterns: see
[`${CLAUDE_SKILL_DIR}/references/model-behavior.md`].

Full API details and technique combinations: see [`${CLAUDE_SKILL_DIR}/references/claude-specific.md`].

---

## Context Engineering

Context engineering is the 2026 evolution beyond prompt engineering — designing dynamic systems that provide the right
information and tools, in the right format, at the right time.

**Key distinction:** prompt engineering crafts a single text string; context engineering manages all inputs to the model
— system prompts, conversation history, retrieved documents, tool results, memory.

**Core principles:**

- Most agent failures are context failures, not model failures
- Find the smallest set of high-signal tokens that maximizes the desired outcome
- Treat context as a finite resource with diminishing marginal returns
- Organize context into explicit labeled sections for model parseability

**Management patterns:**

- **Compaction** — summarize nearing-limit context; preserve decisions and open questions, discard raw tool outputs
- **Structured note-taking** — agent writes selective notes to persistent storage for state continuity
- **Multi-agent isolation** — sub-agents handle deep dives in clean contexts; return condensed summaries
- **Just-in-time retrieval** — load identifiers upfront, fetch full content on demand via tools

Full depth: see [`${CLAUDE_SKILL_DIR}/references/context-engineering.md`].

---

## Long Context Rules

When working with 20K+ token documents:

- **Documents at the top, query at the bottom** — exploits the U-shaped attention curve
- **Wrap each document in XML tags** with identifying metadata (source, type, date)
- **Ground responses in quotes** — ask Claude to quote relevant passages before answering
- **Remove noise** before including documents — strip boilerplate, headers, navigation
- **Place instructions at the end** after all documents

Document organization, chunking strategies: see [`${CLAUDE_SKILL_DIR}/references/long-context.md`].

---

## Prompt Chaining Rules

When a single prompt produces error propagation, decompose into a chain of simpler prompts:

- **Single responsibility** — each prompt does one thing well
- **Clear interfaces** — define what each step receives and produces
- **Validation points** — check output before passing to next step
- **Chain when there's a natural validation boundary** — avoid over-chaining

Chain topologies, meta prompting, APE: see [`${CLAUDE_SKILL_DIR}/references/workflow-patterns.md`].

---

## When Prompting Isn't Enough

Start with prompt engineering. If quality plateaus, consider:

- **RAG** — need current/accurate external data the model doesn't have
- **DSPy** — metric-driven automatic prompt optimization for complex pipelines with labeled eval data
- **Fine-tuning** — need deep domain expertise prompting can't achieve

These compose — combine as needed. Treat prompts as software: version them, test them, monitor them in production.

Strategy comparison, DSPy details, production quality gates: see
[`${CLAUDE_SKILL_DIR}/references/optimization-strategies.md`].

---

## Security Rules

When a prompt handles **untrusted input** (user-provided content, web scraping, external documents):

- **Mark trust boundaries** — separate trusted instructions from untrusted data with delimiters
- **Harden the system prompt** — explicit boundaries, sandwich defense (repeat critical instructions after user content)
- **Validate input** — flag instruction-override patterns, unusual length, encoding attempts
- **Filter output** — block responses containing sensitive data patterns
- **Apply least privilege** — give the LLM access only to data and tools it needs
- **Require human approval** for sensitive or destructive actions

**Prompt injection cannot be fully prevented** — defense is about reducing attack surface, limiting blast radius, and
detecting incidents.

OWASP Top 10, attack taxonomy, defense patterns: see [`${CLAUDE_SKILL_DIR}/references/security.md`].

---

## Writing Prompts as an Agent

**STOP — load [`${CLAUDE_SKILL_DIR}/references/agent-authored-prompts.md`] before drafting.** The summary below is
orientation only; the reference holds the decomposition workflow, failure-mode taxonomy, and pipeline rules required to
write a non-broken agent prompt.

When you (the AI) are authoring a prompt for another model to execute — skills, system prompts, subagent instructions:

- Treat prompts as programs — define signature (inputs, outputs, success criteria) before writing text
- Decompose into components, scaffold with XML, then draft
- Every generated prompt must be self-contained — the receiving agent has zero knowledge of your context
- Include explicit output format with a concrete example, not just a description
- Embed validation criteria the receiving agent can self-check against
- Sanitize all user-supplied content before incorporating into generated prompts

**Key failure modes:** blob-prompts (unstructured paragraphs), context leakage (embedding orchestrator state), ambiguous
output contracts, instruction drift across iterative rewrites.

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
- [ ] No blanket CoT — let reasoning models decide depth per request
- [ ] KV lists for lookups; tables only for genuinely 2D comparisons
- [ ] Few-shot examples calibrate format/style, not teach known patterns
- [ ] Prior-model scaffolding removed when targeting a newer model (old triggers overtrigger)

**When you authored the prompt as an agent (skill, subagent, system prompt, output style):**

- [ ] Loaded [`agent-authored-prompts.md`] BEFORE drafting — not after
- [ ] Generated prompt is self-contained — no orchestrator context leakage
- [ ] Output format example included (concrete, not just a description)
- [ ] Validation criteria embedded for the receiving agent to self-check
- [ ] User-supplied content sanitized before incorporation
- [ ] Output contract (signature: inputs, outputs, success criteria) defined before text was written

## Related Skills

- `skill-engineering` — applies prompt techniques to SKILL.md design, description formulas, and content architecture
- `subagent-engineering` — applies prompt techniques to subagent system prompts, tool scoping, and delegation triggers
- `output-style-engineering` — applies prompt techniques to persona definition, tone examples, and behavioral rules
- `claude-code-sdk` — reference for Claude Code extensibility APIs when building any AI artifact
