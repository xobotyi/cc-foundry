# Superseded Techniques

Lookup for techniques the older prompt-engineering literature treats as core. Each entry answers one question: **should
I reach for this?** Most answers are no, but the reason matters — a technique absorbed into model defaults needs
different handling from one relocated to another surface, and both differ from one nobody has re-measured.

Status describes models that reason natively, follow instructions literally, and call tools without being taught to. On
a model lacking any of those, the older recommendation may still apply — check before assuming.

Status vocabulary:

- **ABSORBED** — the model does it natively. Adding the instruction now compounds with existing behavior.
- **RELOCATED** — still correct, but belongs on a different surface: harness, interface, or code.
- **NARROWED** — survives in a specific case; the general recommendation does not.
- **UNEVIDENCED** — no measurement located either way. Absence of evidence, not evidence of death.
- **REMOVED** — returns an API error.

---

## Reasoning elicitation

- **Chain-of-thought ("think step by step")** — SOLVED: models that would not decompose a problem unless told to.
  STATUS: ABSORBED, and RELOCATED for depth control. IN PRACTICE: reasoning depth is the effort setting. Vendor guidance
  for reasoning models advises against generic step-by-step instructions. STILL VALID WHEN: the reasoning is itself part
  of the deliverable — you want the steps in the output because a human will read them.

- **Self-consistency (sample N, majority vote)** — SOLVED: high-variance single samples on arithmetic and symbolic
  tasks. STATUS: UNEVIDENCED. IN PRACTICE: no ablation located. Do not retain as a default recipe. STILL VALID WHEN: you
  already run N samples for another reason and voting is free.

- **Tree-of-Thoughts** — SOLVED: single-path reasoning that could not backtrack. STATUS: UNEVIDENCED as a prompt
  pattern; RELOCATED in practice. IN PRACTICE: parallel exploration happens as native multi-agent decomposition rather
  than one prompt simulating a search tree. STILL VALID WHEN: nothing located supports reaching for it first.

- **Reflexion (self-critique and retry)** — SOLVED: no mechanism to learn from a failed attempt. STATUS: ABSORBED for
  the generic form; NARROWED for the structured form. IN PRACTICE: these models catch and fix their own mistakes without
  prompting, and "double-check your answer" compounds into over-verification. STILL VALID WHEN: long-horizon runs, where
  a **separate fresh-context verifier subagent** with its own rubric outperforms self-critique. That is an architecture,
  not a sentence in a prompt.

## Demonstration

- **Few-shot / multishot examples** — SOLVED: format and label ambiguity. STATUS: NARROWED, and split by surface. IN
  PRACTICE: still recommended for output format, tone, and genuinely ambiguous semantics — three to five, wrapped in
  tags. But for **tool behavior** they constrain the model to the demonstrated exploration space; encode that in
  parameter names, enums, and the tool description instead. STILL VALID WHEN: the target is a style or shape the model
  cannot infer from a description.

- **Generated knowledge prompting** — SOLVED: models that lacked recall on the task domain. STATUS: ABSORBED. IN
  PRACTICE: the model retrieves or reasons its way there, or a tool does. STILL VALID WHEN: nothing located.

- **Active prompting / directional stimulus** — SOLVED: example selection and steering for weak in-context learners.
  STATUS: UNEVIDENCED. IN PRACTICE: no work located. STILL VALID WHEN: nothing identified.

## Framing

- **Role / persona prompting ("you are a senior engineer")** — SOLVED: register and tone drift. STATUS: NARROWED
  sharply. IN PRACTICE: specifying audience, register, length, and structure gives the model a target; a persona gives
  it a vibe, and vibes drift. Expert-persona framing as a _capability_ lever has no supporting evidence for these
  generations. STILL VALID WHEN: the role is itself the product contract — a customer-facing assistant whose identity is
  part of the spec.

- **Emphasis scaffolding (`CRITICAL`, `IMPORTANT`, all-caps, emoji markers)** — SOLVED: instruction dilution in long
  prompts on weaker models. STATUS: ABSORBED and counterproductive. IN PRACTICE: when a rule is ignored, the file is too
  long and the rule is lost. Delete other rules rather than shouting this one. STILL VALID WHEN: nothing.

- **XML tag structuring** — SOLVED: ambiguous boundaries between instructions, context, and data. STATUS: LIVE for
  multi-part prompts, UNEVIDENCED as a performance trick. IN PRACTICE: vendor guidance still recommends tags when a
  prompt mixes instructions, examples, and variable input. It is not a universal accuracy lever. STILL VALID WHEN: the
  prompt genuinely has parts that a reader could confuse.

## Orchestration

- **ReAct (reason + act loop)** — SOLVED: models that would not interleave reasoning with tool calls. STATUS: ABSORBED
  as runtime behavior. IN PRACTICE: this is what an agent loop _is_. Naming the pattern in a prompt adds nothing. STILL
  VALID WHEN: you are building the loop rather than prompting inside one.

- **PAL / program-aided reasoning** — SOLVED: arithmetic and precise computation in token space. STATUS: RELOCATED. IN
  PRACTICE: the model writes and runs code natively; deterministic filtering and aggregation belong outside the context
  window entirely. STILL VALID WHEN: the concept is permanent — the prompt recipe is not.

- **Prompt chaining** — SOLVED: error propagation in one long prompt. STATUS: NARROWED. IN PRACTICE: adaptive reasoning
  and native delegation handle most multistep work internally. STILL VALID WHEN: you need to inspect, log, evaluate, or
  branch on an intermediate output. The common surviving case is generate → review against criteria → refine, as
  separate calls.

- **Meta-prompting (ask the model to write the prompt)** — SOLVED: authoring effort. STATUS: LIVE but unremarkable. IN
  PRACTICE: it works and needs no technique name. STILL VALID WHEN: always available; not a discipline.

- **APE / automated prompt search** — SOLVED: manual prompt iteration without a metric. STATUS: NARROWED. IN PRACTICE:
  requires an eval set to mean anything. Without one it optimizes noise. STILL VALID WHEN: you have a labeled eval and a
  production pipeline worth tuning.

- **DSPy** — SOLVED: hand-tuned prompts in multi-stage pipelines. STATUS: UNEVIDENCED. IN PRACTICE: no ablation located
  for these generations. Do not call it obsolete and do not call it best practice. STILL VALID WHEN: you have labeled
  eval data and a compound pipeline — the original premise still holds even though the numbers are stale.

## API-level

- **Prefilling the assistant turn** — SOLVED: forcing output format, skipping preamble. STATUS: REMOVED on APIs that
  reject a trailing assistant message. IN PRACTICE: structured outputs for schemas, a system instruction for preamble,
  and a quoted continuation in the user turn to resume. STILL VALID WHEN: the API still accepts it.

- **Output-format constraints in prose** — SOLVED: unparseable output. STATUS: RELOCATED. IN PRACTICE: a schema, enum,
  or typed tool is the contract; prose describing a format is a weaker version of the same thing. STILL VALID WHEN: the
  consumer is human and no schema applies.

---

## How to answer "should I use X?"

1. If the model already does it — deleting the instruction is the improvement.
2. If it belongs to another surface — say which one and stop writing prompt text.
3. If nobody has measured it — say that, rather than inheriting the old recommendation or inventing a new verdict.

The third case is the one most often gotten wrong in both directions. "Nothing measured" is a real answer and it is not
the same as "dead."
