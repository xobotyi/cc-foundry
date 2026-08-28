# Persistent Context

Why standing instructions behave differently from a one-shot request, and what follows for anyone writing them.

## The privileged position

System-level text sits above user text in the instruction hierarchy, and models are trained to treat it as the more
authoritative source. Three consequences shape everything else:

- **Persistence amplifies in both directions.** A good rule helps on every request; a bad one hurts on every request. A
  one-shot prompt fails gracefully because it fails once. A standing instruction fails repeatedly and identically.
- **The text does not arrive alone.** It loads alongside conversation history, other instruction files, tool
  definitions, and tool results. A file that reads well in isolation competes for attention with everything else
  present.
- **Authority suppresses skepticism.** Content the model would question coming from a user, it accepts from a system
  position. This is why a wrong standing rule is more dangerous than a wrong request, not less.

## Attention is U-shaped

Instruction adherence is strongest at the beginning and end of context, and weakest in the middle. The degradation is
substantial — a rule buried mid-file can be effectively absent while appearing present to anyone reading the file.

**Placement strategy:**

- **Opening** — identity, domain framing, and the constraints that must never be violated
- **Middle** — detailed rules by topic, lookup tables, examples. Content valuable when consulted, not requiring constant
  attention
- **Closing** — the critical rules again, and any checklist

**Dual placement**: state a must-follow rule near the top and again at the end, phrased differently — as a principle
first, as a check second. Identical repetition reads as redundancy; the same rule in two registers reads as emphasis.

## Length itself is a cost

Adding tokens degrades instruction-following even when the added tokens are irrelevant, and even when the model can
retrieve them perfectly. This is not a retrieval failure. Presence alone consumes attention that other instructions
would have received.

**Formatting is not free.** Decorative whitespace, deep indentation, blank lines between every bullet, and elaborate
dividers all cost real tokens. Human readability and model parseability diverge here: structure that helps a person skim
can be pure overhead to the reader that matters.

The practical rule: a file with substantial formatting overhead is effectively that much longer than its content, and
pushes more of itself into the low-attention middle.

## Instruction drift

In extended interactions, models gradually de-prioritize the instructions they started with as conversation history
accumulates. Adherence to a standing rule erodes over the course of a long session even when nothing about the rule
changed.

This is why a rule that demonstrably worked in testing can appear to stop working in production — the test was short and
the production session is not.

## Constraint overload

Adding constraints does not monotonically improve compliance. Past a point, the model begins omitting clauses or
applying them inconsistently, and the omissions are not the ones you would predict.

Constraints also **interact**: some reinforce each other, others conflict in ways neither states. Before adding a rule,
audit the existing set for conflict — a contradiction the model resolves silently is worse than either rule alone,
because the resolution is invisible and inconsistent.

## Declarative over procedural

- **Declarative** — facts, constraints, conventions stated as rules. Models apply these more reliably across varied
  inputs. Use for the majority of standing content.
- **Procedural** — ordered steps. Correct only when sequence genuinely matters. Effectiveness collapses past roughly ten
  to fifteen steps in one sequence; beyond that, decompose into named sub-procedures.

The hybrid that works: declarative framing at the top level for identity, conventions, and constraints, with procedural
steps confined to the specific workflows that need them.

## Instruction files earn their place or cost you

Repository-level instruction files can **reduce** task success while increasing cost. The mechanism is not that agents
ignore them — it is that agents follow them too diligently, treating every line as an additional constraint to satisfy.

The split that predicts which way it goes:

- **Orientation that saves exploration** — where things are, what the non-obvious conventions are. Improves efficiency.
- **Restated content the agent could discover** — repository overviews, directory trees, dependency lists. Costs tokens,
  adds constraints, and returns nothing. This is the largest single source of waste in standing instructions.
- **Additional requirements and checklists** — broadens scope and reduces success on the actual task.

## The deletion test

Before adding a rule, verify the model's default behavior is insufficient. If removing the rule does not change output
quality, it should not exist.

This does not mean minimize everything. Standing instructions exist precisely to add what the model does not know:
operator preferences it cannot infer, project facts that surprise, thresholds that need stating. It means do not spend
attention on what the model already does well.

Audit an existing file by asking of each line: **if I delete this, does output quality measurably change?** Most lines
in most files do not survive the question.
