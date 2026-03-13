# Agent-Authored Prompts

How to write good prompts when the author is an AI agent, not a human.

Most prompt engineering guidance assumes a human iterating in a playground. When an agent writes prompts — for skills,
system prompts, sub-agents, or downstream LLM calls — the process, failure modes, and quality criteria differ. This
reference covers the gap, grounded in research on automated prompt optimization (DSPy, OPRO, TextGrad, meta-prompting).

## Contents

- [When This Applies](#when-this-applies)
- [Core Shift: Programs, Not Strings](#core-shift-programs-not-strings)
- [Agent Prompt-Writing Workflow](#agent-prompt-writing-workflow)
- [Decomposition](#decomposition)
- [Draft Generation](#draft-generation)
- [Self-Evaluation](#self-evaluation)
- [Self-Correction](#self-correction)
- [Failure Modes](#failure-modes)
- [Quality Dimensions](#quality-dimensions)
- [Optimization Patterns](#optimization-patterns)
- [Writing Persistent Artifacts](#writing-persistent-artifacts)

---

## When This Applies

Use this reference when:

- You are writing a prompt that another LLM will execute
- You are generating a system prompt, skill, or agent instruction
- You are creating a prompt template with variable slots
- You are refining a prompt based on observed output failures

---

## Core Shift: Programs, Not Strings

Research on automated prompt optimization (DSPy, OPRO, TextGrad) converges on a key insight: **treat prompts as programs
to be optimized, not strings to be written.** This means:

- **Define the interface first.** Before writing text, define what the prompt receives and produces — its "signature."
  DSPy formalizes this as `context, query -> reasoning, answer`. For skills, the signature is: what triggers it
  (description), what it needs (inputs/context), what it produces (behavioral change, output format).
- **Optimize against metrics, not intuition.** Agents lack the "this could be better" intuition that drives human
  iteration. Substitute explicit quality dimensions and scoring. Every draft should be evaluated against measurable
  criteria before delivery.
- **Separate structure from content.** Meta-prompting research shows that structural scaffolds (templates for how a
  category of tasks should be approached) are more transferable and robust than content-specific instructions. Write the
  structure first, then fill in domain content.

---

## Agent Prompt-Writing Workflow

```
1. Define signature  → Inputs, outputs, constraints, success criteria
2. Decompose        → Separate role, task, constraints, format, context
3. Scaffold         → Assemble structure with XML tags
4. Draft content    → Fill in the scaffold with domain-specific text
5. Evaluate         → Score against quality dimensions
6. Correct          → Targeted fixes, not wholesale rewrites
7. Verify           → Mental simulation with an unseen input
```

Steps 5-6 may loop, but cap iterations at 2-3. If the prompt isn't converging, the problem is structural (needs
decomposition rework), not textual (needs word changes).

---

## Decomposition

Before writing any prompt text, decompose the target task into distinct components. This prevents "blob-prompts" —
sprawling paragraphs that mix context, instructions, and constraints.

**Separate these concerns:**

| Component            | What it contains                     | Example                           |
| -------------------- | ------------------------------------ | --------------------------------- |
| **Role/domain**      | Domain priming (not persona)         | "This is a security audit task"   |
| **Task description** | Primary action verb + objective      | "Review code for vulnerabilities" |
| **Constraints**      | Formal rules the output must satisfy | "Max 5 findings, severity-ranked" |
| **Output format**    | Exact structure of the response      | JSON schema, XML tags, template   |
| **Context**          | Information needed but not acted on  | API docs, prior conversation      |
| **Examples**         | Input/output demonstrations          | 1-3 few-shot pairs                |

**Why decompose first:** Research on multi-agentic prompt optimization shows that decoupling the primary task
description from granular constraints allows each to be refined independently. This is the "signature" concept from DSPy
— define the interface before writing the implementation.

**Structural scaffolding:** After decomposition, assemble using XML tags:

```xml
<domain>Web application security audit. Apply OWASP Top 10.</domain>

<instructions>
Review the provided code for security vulnerabilities.
Focus on injection attacks, authentication bypasses, and data exposure.
</instructions>

<constraints>
- Report at most 5 findings
- Rank by severity: critical > high > medium > low
- Each finding must include: location, vulnerability type, remediation
</constraints>

<output_format>
Return findings as a JSON array:
[{"location": "...", "severity": "...", "type": "...", "remediation": "..."}]
</output_format>

<code>
{{CODE_TO_REVIEW}}
</code>
```

---

## Draft Generation

When generating the prompt text, follow these principles:

**Start with the constraint envelope, not the task.** Agents tend to front-load the task description and under-specify
constraints. Invert this: define what "correct output" looks like first, then describe the task that produces it. This
anchors the prompt around verifiable criteria.

**Use domain priming, not persona assignment.** Research shows "This is a security audit task" is more reliable than
"You are an expert security auditor." Persona prompting is volatile — domain priming provides consistent improvements
across models.

**Use imperative voice throughout.** "Analyze the input and return..." not "You should analyze the input and you might
want to return..." Agents generating prompts often hedge with conditional language — this reduces instruction-following
reliability.

**Specify the negative space.** Explicitly state what the output should NOT contain. Agents often omit negative
constraints because they focus on what they want, not what they want to prevent:

```
Do NOT include explanatory preamble.
Do NOT wrap JSON in markdown fences.
Do NOT add fields beyond those specified.
```

**Ground variable slots.** When creating templates with `{{VARIABLE}}` slots, annotate each slot with its expected
content type and size:

```xml
<!-- {{DOCUMENT}}: 1-50 page text document, may contain tables -->
<!-- {{QUERY}}: Single question, typically 1-2 sentences -->
```

**Choose declarative vs procedural deliberately.** For constraints and conventions, use declarative bullet lists. For
workflows with strict ordering, use numbered steps. Don't default to one style — match the instruction style to what the
content demands. See [`${CLAUDE_SKILL_DIR}/references/persistent-context.md`] for the full decision framework.

---

## Self-Evaluation

After generating a draft, evaluate it against these dimensions before delivering. This is the critical step — it
substitutes for the human intuition that agents lack.

**Structural check:**

- Are instructions separated from context using XML tags or clear delimiters?
- Is the output format explicitly specified with an example?
- Are constraints stated as verifiable conditions, not vague guidance?
- Is domain priming specific enough to activate relevant knowledge?

**Ambiguity check — the golden rule adapted for agents:** "If I were a different model instance with no prior context,
would I produce the correct output from this prompt alone?" Simulate being the reader:

- Is there exactly one valid interpretation of each instruction?
- Could any instruction be satisfied by an output that's technically correct but not useful?
- Are there implicit assumptions that aren't stated?

**Completeness check:**

- Does the prompt contain all information needed to produce the output?
- Are there references to external context that isn't provided?
- If the prompt uses examples, do they cover the range of expected inputs?

**Efficiency check:**

- Could any instruction be removed without changing the output?
- Are there redundant or near-duplicate instructions?
- Is the prompt longer than necessary for the task complexity?

**Persistent-context check** (for skills, system prompts, CLAUDE.md):

- Are critical rules in the top 20% or bottom 20% (not buried in middle)?
- Are constraints declarative (not procedural where they shouldn't be)?
- Would CoT instructions here help or hurt instruction-following?
- Do examples calibrate format/style, or are they teaching (redundant)?
- Does every instruction earn its place — or does the model already do this correctly without it?

---

## Self-Correction

When self-evaluation identifies issues, apply targeted corrections — not wholesale rewrites. Agents that rewrite entire
prompts on each iteration often introduce new problems while fixing old ones.

**The correction protocol:**

1. **Identify the specific failure** — "constraint X is ambiguous" or "output format lacks an example"
2. **Edit the specific section** — change the constraint or add the example
3. **Re-evaluate only the changed section** — verify the fix doesn't conflict with other parts
4. **Cap iterations at 2-3** — if the prompt isn't converging, the problem is likely structural (needs decomposition
   rework), not textual

**Common corrections:**

| Issue found            | Correction                                                      |
| ---------------------- | --------------------------------------------------------------- |
| Vague constraint       | Replace with measurable criterion: "concise" → "under 50 words" |
| Missing format example | Add one input/output pair showing exact structure               |
| Blob paragraph         | Split into XML-tagged sections                                  |
| Hedging language       | Replace conditionals with imperatives                           |
| Implicit assumption    | Make it an explicit constraint or context item                  |
| Redundant instructions | Remove the weaker duplicate                                     |
| Persona assignment     | Replace with domain priming                                     |
| Prescriptive CoT       | Replace with high-level guidance or remove                      |

---

## Failure Modes

Agents writing prompts exhibit distinct failure patterns. Know these to avoid them.

### Blob-Prompts

**What:** Unstructured paragraphs mixing instructions, context, and constraints. The most common agent failure mode.

**Why:** Agents generate text sequentially and naturally produce flowing prose. Structure requires deliberate
architectural decisions.

**Fix:** Always decompose before drafting. Use XML tags. Never deliver a prompt that's a single paragraph of
instructions.

### Confident Sub-Optimality

**What:** The agent produces a prompt that's plausible and coherent but measurably worse than alternatives.

**Why:** Agents lack the "this could be better" intuition. A grammatically correct, logically coherent prompt satisfies
generation objectives even if it underperforms. DSPy and OPRO research shows that systematically generated alternatives
frequently outperform human-intuition-driven first drafts.

**Fix:** Explicit self-evaluation against quality dimensions. Score the draft and identify the weakest dimension before
delivering.

### Overfitting to Examples

**What:** When given examples of desired output, the agent writes prompts that would produce those exact examples but
fail to generalize.

**Why:** Pattern-matching on surface features rather than extracting the underlying principle.

**Fix:** Mental simulation with an input that differs significantly from any example. If the prompt wouldn't handle it,
the instructions are too narrow.

### Instruction Inflation

**What:** Each refinement cycle adds instructions without removing any, producing increasingly verbose prompts.

**Why:** Agents add constraints to fix failures but don't audit existing constraints for redundancy or conflict.
Research shows unnecessary requirements reduce task success — more instructions is not always better.

**Fix:** After each correction, re-read the full prompt and remove any instruction that's now redundant. Apply the
deletion test: if removing an instruction doesn't change output quality, remove it.

### Persona Defaulting

**What:** Agent reflexively assigns an expert persona ("You are a senior X with 20 years of experience") without
considering whether domain priming would be more effective.

**Why:** Persona assignment is a well-known pattern that feels natural. Research showing its volatility is less
well-known.

**Fix:** Default to domain priming. Use persona only when identity framing is specifically needed (e.g., writing in a
character's voice).

### Recursive Repetition

**What:** In reasoning loops, agents get stuck repetitively generating the same thoughts without reaching a conclusion.

**Why:** No termination conditions, or evaluation criteria aren't discriminating enough to detect stalls.

**Fix:** Include explicit convergence criteria: maximum iterations, minimum improvement threshold, or "stop if no
progress after N cycles."

---

## Quality Dimensions

Score agent-generated prompts on these dimensions. A production-grade prompt should be strong on all — weakness in any
one can cause failures.

| Dimension            | Question to ask                              | Red flag                                                 |
| -------------------- | -------------------------------------------- | -------------------------------------------------------- |
| **Clarity**          | One interpretation per instruction?          | "Appropriately," "as needed," "relevant"                 |
| **Specificity**      | Constraints measurable and verifiable?       | No word counts, no format examples, no success criteria  |
| **Robustness**       | Minor input variations → consistent outputs? | Assumes specific input length, format, or content        |
| **Brevity**          | Every token earning its place?               | Redundant instructions, hedging, unnecessary preamble    |
| **Completeness**     | Everything needed is provided?               | References to context not included, implicit assumptions |
| **Generalizability** | Works beyond specific examples?              | Instructions describe examples rather than the pattern   |
| **Structure**        | Components separated with boundaries?        | Single paragraph mixing instructions and constraints     |
| **Placement**        | Critical rules in primacy/recency zones?     | Important rules buried in middle of long document        |
| **Security**         | Untrusted input boundaries marked?           | User input mixed with instructions without delimiters    |

### Minimum Viable Quality

Match effort to stakes:

- **Throwaway / exploratory:** Clarity + specificity
- **Repeated use / templates:** Add robustness + generalizability
- **Production / user-facing:** All dimensions, with security if untrusted
- **Skills / system prompts:** All dimensions — highest-leverage prompts because they shape behavior across many
  interactions. Add placement and apply persistent-context rules.

---

## Optimization Patterns

When a prompt must be iteratively improved beyond self-evaluation.

### Candidate-Scoring Pattern

Generate multiple variants, evaluate each against a metric, select best. This is the core pattern behind OPRO
(Optimization by PROmpting): use the LLM itself to propose instruction variants, score them on a validation set, and
select the winner.

```
1. Generate 3-5 instruction variants for the same task
2. Run each against a small validation set (5-10 examples)
3. Score outputs on the target metric
4. Select the highest-scoring variant
5. Use the winning variant as seed for next iteration (optional)
```

### Failure-Analysis Pattern

Execute the current prompt, collect failures, analyze causes, edit to prevent. This is the core pattern behind TextGrad:
use textual feedback on failures as "gradients" to guide targeted edits.

```
1. Run current prompt on a batch of inputs
2. Identify outputs that failed quality criteria
3. Analyze: "Why did the prompt fail for these specific cases?"
4. Propose a targeted edit preventing those errors
5. Verify the edit doesn't regress on previously passing cases
```

### Reflection Pattern

Critique from a different perspective, then revise. A single-agent version of the evaluate-correct loop.

```
1. Generate prompt draft
2. Switch to critic: "What are the three biggest weaknesses?"
3. Address each identified weakness
4. Optionally repeat for one more cycle
```

### Bootstrapped Demonstration Pattern

From DSPy: instead of hand-writing examples, generate them automatically.

```
1. Run the prompt on a set of inputs without examples
2. Identify outputs that meet quality criteria
3. Use those successful input/output pairs as few-shot examples
4. Re-run with the bootstrapped examples
```

This is particularly useful for skills where good examples are hard to write manually but easy to recognize when
produced.

### Bilevel Pattern (System + Task Prompts)

When maintaining both a system prompt and task-specific prompts:

- **Inner loop:** Optimize task prompts for specific performance
- **Outer loop:** Optimize the system prompt to generalize across tasks

Prevents the common failure of a system prompt that works for one task but degrades others — exactly the pattern used in
skills that persist across varied user requests.

---

## Writing Persistent Artifacts

When the prompt being written will persist (skills, system prompts, CLAUDE.md), apply the persistent-context rules from
SKILL.md (placement strategy, declarative defaults, deletion test, CoT avoidance) plus these agent-specific additions:

**Test with varied requests.** A persistent prompt serves many different user requests. Simulate at least 3 very
different requests and verify the prompt handles all of them. An API prompt needs to handle one request well; a skill
needs to handle hundreds.

**Audit after each correction cycle.** Agents adding rules to fix failures rarely remove existing rules that became
redundant. After each correction, re-read the full prompt and apply the deletion test to every instruction — not just
the new ones.

---

## Applying This to Claude Code Artifacts

| Artifact            | Key decomposition                                     | Priority dimensions                                |
| ------------------- | ----------------------------------------------------- | -------------------------------------------------- |
| **Skill SKILL.md**  | Instructions vs references, declarative vs procedural | Clarity, placement, completeness, generalizability |
| **Output style**    | Persona vs formatting vs examples                     | Robustness, brevity, consistency                   |
| **Subagent prompt** | Task vs tools vs constraints vs termination           | Specificity, completeness, security                |
| **Hook prompt**     | Trigger vs action vs output format                    | Brevity (token budget), specificity                |
| **System prompt**   | Domain priming vs rules vs constraints                | All dimensions — highest leverage                  |

For each artifact type, define the signature (inputs → outputs) and decompose the artifact-specific concerns before
generating any text.
