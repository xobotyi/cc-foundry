# Structured Data in Prompts

How you shape data inside a prompt changes how accurately the model reads it. The spread between the best and worst
format on identical content is large enough to matter — comparable to the gap between a good and a mediocre prompt.

The rules below are selection rules. They do not depend on which model you target, except where noted.

## Independent entries: key-value lists

Data where each entry is read on its own — route tables, tool inventories, configuration mappings, hook events,
permission modes, scoring rubrics.

```markdown
- **PreToolUse** — fires before each tool call
- **PostToolUse** — fires after each tool call
- **UserPromptSubmit** — fires on user message submission
```

A markdown table carrying the same content reads measurably worse. The cost comes from the reader having to hold a
column structure that no entry actually uses.

## Genuine comparisons: tables

Data where cross-criteria scanning is the point — decision matrices, feature comparisons across alternatives, capability
grids.

**The test**: remove a column. If comparative meaning is lost, it is a table. If the rows still stand alone, it was a
key-value list wearing a table's formatting.

## Nested structures: YAML

Configurations, hierarchies, and anything more than two levels deep. YAML reads more accurately than JSON or XML at
depth, and costs fewer tokens for the same content.

The advantage grows with nesting depth. At one or two levels the formats converge and the choice stops mattering.

## Formats to avoid for input

- **CSV** — no structure survives beyond the header row; the model reconstructs meaning positionally and gets it wrong.
- **XML for data** — verbose, and the tag noise competes with content. Useful for _marking regions_ of a prompt,
  unhelpful as a container for records.
- **JSON for large record sets** — punctuation overhead scales badly and adds nothing the model uses.

Novel or compact serialization formats designed to save tokens lose more in comprehension than they save in budget.
Prefer a format the model has seen constantly over one optimized on paper.

## Output constraints cost reasoning

Requiring a rigid output schema degrades reasoning quality on the task itself. The tighter the constraint, the larger
the drop — and the effect is strongest on exactly the tasks where reasoning matters most.

- **Use structured output when a downstream consumer parses it.** That is a real requirement and worth the cost.
- **Do not use it for readability.** If a human reads the result, let the model write freely.
- **For reasoning-heavy work, separate the passes.** Let the model reason in prose, then convert to schema in a second
  step. This recovers most of the loss.

## Format sensitivity scales inversely with capability

Smaller and older models are highly sensitive to format choice — it can dominate content quality. More capable models
are substantially more robust, and format matters less than what the content says.

The practical consequence: a prompt tuned for a small model may carry format scaffolding that a larger one does not
need, and that scaffolding is not free. When moving a prompt to a more capable model, format decisions are among the
first things worth re-testing.

## Consistency beats optimality

A format the model parses reliably, applied consistently across a prompt, outperforms a theoretically better format
applied unevenly. Mixed formats within one prompt force the model to infer which convention applies where.

Pick one per content type and hold it.
