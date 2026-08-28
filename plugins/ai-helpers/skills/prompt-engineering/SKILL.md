---
name: prompt-engineering
description: >-
  Write and debug instruction text on any surface: requests, standing context such as CLAUDE.md, tool and schema
  descriptions, and prompts written for other model instances.
when_to_use: >-
  Invoke whenever instruction text is touched at all — writing, editing, reviewing, auditing, or debugging a prompt,
  a system prompt, CLAUDE.md, a skill body, a tool or schema description, or a brief for another model instance.
  Also invoke on the symptoms: a stated rule gets ignored, output is the wrong shape, a prompt grew too long, a tool
  is called wrongly, an instruction went stale. Covers the instruction text itself; packaging an artifact belongs to
  the engineering skills.
compatibility: Uses Claude Code frontmatter beyond the Agent Skills spec (when_to_use)
---

**A model that reasons natively does not need to be taught how to think. It needs to be told what done looks like, and
left alone.** Instruction text that explains, encourages, or supervises costs more than it buys — the model already does
those things, and your text competes with its own judgment.

Prompt text lives on four surfaces, and the same words behave differently on each. A rule that helps in a request can
tax every turn for months as persistent context. Identify the surface before writing.

## On encountering a defective prompt

Do not read past it. Prompt text that violates these rules is found far more often than it is written — in a skill, a
tool description, a standing instruction file, a subagent brief.

- **Already editing that file** — fix it, in the same change.
- **Not editing that file** — name the defect and the fix, once, in a sentence. Then continue the task you were asked to
  do.
- **Flag what changes behavior**, not what offends taste. A stale fact, a contradiction between two rules, a filter that
  suppresses recall, a rule the model already follows — these cost output. Wording preferences do not.
- **One flag, then proceed.** A task does not become a prompt audit because a prompt was involved. Raising the same
  class of defect repeatedly in one session costs more attention than the defect does.

## Not a prompt problem

Write nothing for these. Each has a fix that prompt text cannot reach, and reaching for words instead is the most common
wasted motion in this skill's domain.

- **Reasoning is too shallow or too deep** → the effort setting, not the wording
- **Context degrades across a multi-turn run** → compaction and reasoning persistence. This is not the same as a single
  prompt carrying large documents, which is prompt text — see [Long context](#long-context)
- **A prohibition must actually hold** → permissions, schemas, sandboxes. Prose steers; it does not enforce
- **The rule is deterministic and machine-checkable** → compile it into code and have the model call it
- **Deterministic filtering or aggregation over tool output** → run it as code outside the context window

The scale matters. A wrong setting can cost more than every prompt decision on the page combined, and no amount of craft
in the wording recovers it. Check the setting first; it is faster to rule out than to write around.

## Routing by symptom

- **Output shape, tone, or format is wrong** → [request](#1-the-request)
- **A standing rule is ignored despite being stated** → [persistent context](#2-persistent-context). The file is too
  long and the rule is lost. Delete others rather than restating this one louder
- **A tool is used wrongly, or not at all** → [tool and schema text](#3-tool-and-schema-text)
- **A subagent returns work that misses context you never gave it** → [delegated prompts](#4-delegated-prompts)
- **The model obeyed exactly and the result got worse** → [literalism](#instructions-are-followed-exactly)
- **Output is consistently the wrong shape and the prompt has examples** → the examples are specifying it. See
  [Examples are read literally too](#examples-are-read-literally-too)
- **Answers degrade as the prompt grows, or cite the wrong part of a document** → [long context](#long-context)
- **The instruction was true when written and is false now** → [timelessness](#timelessness)

## The four surfaces

### 1. The request

The one-shot ask. Read once, acted on once. This is the surface where explicit structure pays: clear sectioning,
examples, tags when a prompt mixes instructions with data, and a stated output contract.

- **Specify the output contract.** Format, length, constraints, and what "done" means. This is the one thing the model
  cannot infer, and the one thing worth spending words on.
- **Give the reason, not only the rule.** "Never use ellipses" underperforms "this is read aloud by a speech engine,
  which cannot pronounce them." Stated motivation generalizes to cases you did not enumerate; a bare rule does not.
- **Examples pin shape, never reasoning path.** Three to five, wrapped in tags, when the target is a format, a tone, or
  a genuinely ambiguous label the model cannot infer from a description. An example demonstrating _how to approach_ a
  problem is read as the approach to take — see [Examples are read literally too](#examples-are-read-literally-too),
  which is the mechanism behind every rule in this bullet.
- **The cost of an example scales with how often it is read.** In a one-shot request an unhelpful example wastes tokens
  once. In persistent context it constrains every future run, silently, in a direction nobody re-examines. This skill
  therefore carries no worked prompt: a "here is a bad prompt, here is the fix" walkthrough would teach the shape of
  that one fix to every prompt written afterward.
- **Ask for uncertainty explicitly.** Permission to say "I don't know" has to be granted or the model fills the gap.
- **Say what you want, not what you fear.** Positive examples of the target style outperform prohibitions against the
  wrong one.

### 2. Persistent context

System prompts, CLAUDE.md, skills, memory files. Read on every request, forever.

**A request that is slightly wrong costs one bad response. A standing rule that is slightly wrong costs a small tax on
every request for months — and because it is always present, you stop seeing it.**

- **Admit a rule only if changing it would change intended behavior.** Everything else belongs in runtime injection or
  retrieval.
- **Never restate what the agent can discover.** Repository overviews measurably fail: context files did not improve
  task success while adding over 20% inference cost. The mechanism is not that agents ignore them — it is that agents
  follow them _too_ diligently, treating the extra content as additional constraints to satisfy.
- **Prefer prohibitions with real thresholds over style prescriptions.** Prohibitions with a stated boundary hold;
  prescriptions about how to do the work compete with the judgment the model applies to the case in front of it.
- **Four categories earn their place** — operator opinions the model cannot infer, project facts that surprise, routing
  rules with stated thresholds, named integrations. Persona framing, restated general knowledge, emphasis scaffolding
  (`CRITICAL`, all-caps, emoji markers), and redundant verification demands do not.
- **Prime the domain instead of assigning a persona.** Audience, register, length, and structure give the model a
  target. A persona gives it a vibe, and vibes drift.
- **Add back one rule at a time, only after repeated failure on the same specific issue.** Never speculatively — the
  model reads every line on every turn.
- **Deleting is not automatically safe.** Cutting a standing rule is the default move, but confirm the behavior it
  prevented does not return. A rule that earns its place survives this check; most do not.

Read [`${CLAUDE_SKILL_DIR}/references/persistent-context.md`] when a standing rule is being added, cut, or defended — it
carries U-shaped attention, instruction drift, constraint overload, and the declarative-over-procedural split.

### 3. Tool and schema text

Parameter names, enums, constraints, and tool descriptions. This is prompt text: the model reads it to decide what a
tool is for and how to call it.

- **Encode behavior in the interface rather than in usage examples.** A `status` enum of
  `pending | in_progress | completed` plus one constraint sentence in the description teaches more reliably than worked
  examples — and does not narrow the model's exploration space the way examples do.
- **Put tool instructions in the tool description, not the system prompt.** Duplicating them across both is where
  conflicting guidance comes from, and a model burns reasoning deciding which instruction wins before doing the work.
- **Name parameters so the name carries the constraint.** Expressive names and enums do work that prose cannot, because
  they are present at the moment of the call.
- **State the trigger in the description.** "Call this when the user asks about current prices" belongs on the tool, not
  in a system-prompt paragraph the model reads a thousand tokens earlier.

### 4. Delegated prompts

Text you write for another model instance — a subagent, a pipeline stage, a generated skill.

- **The receiving agent has none of your context.** Every delegated prompt must be self-contained; orchestrator state
  that leaks in as an unexplained reference is the dominant failure mode.
- **Define the contract before the prose** — inputs, outputs, and how the receiver knows it succeeded.
- **Include a concrete output example**, not a description of one.
- **Sanitize anything user-supplied** before it enters a generated prompt.

Read [`${CLAUDE_SKILL_DIR}/references/delegated-prompts.md`] before writing a prompt another model instance will execute
— it carries the contract-first workflow, the failure modes, trust boundaries for untrusted content, verifier
delegation, and the self-containment check. It covers the text; whether to delegate at all, and how to scope the
isolation, is a separate decision.

## The instruction budget

A context holds roughly 100 to 150 instructions before adherence degrades measurably. Past that, the model does not
report strain — it drops or partially applies clauses, and which ones it drops is not predictable. The number is
calibrated against one model generation and moves with capability; the shape of the curve does not.

- **The budget is shared, not per-file.** System prompt, every active skill, every instruction file, and every tool
  description draw on the same allowance. A 30-line addition to a context already holding 120 instructions is not a
  30-line decision.
- **The ceiling is not a target.** Fewer is strictly better at every point below it. There is no threshold under which
  additional instructions become free.
- **Count before adding, not after.** The cost of an instruction is paid on every turn; the benefit only on turns where
  it applies. A rule that matters one time in twenty is a bad trade at any length.
- **Over budget: delete, do not compress.** A rule shortened from three lines to one still occupies a slot. Compression
  saves tokens and saves no attention. Only removal returns budget.
- **Load conditionally what applies conditionally.** Rules needed in one phase belong in a file read at that phase. A
  rule present on every turn should be one that matters on most of them.

## Long context

Arranging large inputs inside a prompt is prompt text, not configuration. The rules below apply to a single request
carrying documents and to an agent whose standing context has grown — both are the same problem.

**Volume itself carries a cost that relevance does not offset.** One controlled run put the passing rate at 8/10 with
~11k characters of context and 3/10 with ~299k, and the drop was the same whether the added material was relevant or
irrelevant. One run is a direction, not a constant — and the direction is that selection beats relevance, so adding
context to fix a wrong answer is the wrong reflex.

- **Documents at the top, the question at the bottom.** Attention is U-shaped: the middle is where content goes to be
  forgotten. Put the instruction after the material it operates on, not before.
- **Label every document with identifying metadata** — source, type, date, id — in a wrapper tag. Unlabeled documents
  cannot be cited, and a model that cannot cite will paraphrase from the wrong one without signalling.
- **Ask for quotes before answers.** Requiring the model to quote the passages it relies on, before it reasons over
  them, grounds the answer and makes a wrong retrieval visible in the output instead of invisible inside it.
- **Strip noise before including.** Boilerplate, navigation, headers, and changelog cruft consume the same budget as
  signal and degrade the same way.
- **Do not rebuild state from raw history every turn.** Maintain the authoritative state as its own object and pass
  that. Re-deriving it from an accumulating transcript is how a long-running agent drifts.
- **Cut before you add.** When an answer is wrong at high volume, the reflex to add clarifying context is backwards; the
  first move is removing material that is present but not load-bearing.

Read [`${CLAUDE_SKILL_DIR}/references/long-context.md`] when a prompt carries documents, or when answers degrade as the
prompt grows — it carries document templates, chunking strategies, quote-grounding patterns, and the point where this
stops being a prompt problem.

## Wording

A rule is read by a system that resolves ambiguity silently — and read again months later, when what it describes has
moved. A sentence fails in two directions: misread now, or read exactly right and no longer true. Neither failure
reports itself, and both are decided at the level of the sentence.

- **One term per concept, every time.** Synonyms read as distinctions. A "rule" that becomes a "directive" three lines
  later may be treated as a second thing with separate scope.
- **Imperative for instructions.** "Return the parsed result." Not "you should return" or "the result should be
  returned."
- **One instruction per sentence.** A sentence carrying two requirements reliably gets one of them applied.
- **Active voice with a named actor.** "The verifier reports findings" leaves no question about who acts. "Findings are
  reported" leaves it open, and the model will pick.
- **Short sentences.** A long sentence buries its operative clause in the middle, where attention is weakest — the same
  curve that governs a whole file governs a sentence.
- **No noun stacks.** Three nouns in a row is the ceiling. "Prompt quality review process checklist" parses as many
  things and specifies none.
- **Every pronoun resolves to exactly one antecedent.** "It", "this", and "that" are where silent misreadings enter. If
  two candidates exist, name the thing.

### Rules about rules

- **A rule must be checkable.** If you cannot tell from the output whether it was followed, it is a sentiment. "Write
  clearly" cannot be checked. "One instruction per sentence" can.
- **State the boundary, not the sentiment.** Bounded beats unbounded regardless of polarity: "do not refactor unrelated
  code" and "keep responses under 200 words" both work. "Follow good style" and "avoid verbosity" do not.
- **Delete hedges.** "Generally", "typically", "where possible", "as appropriate", and "try to" convert a rule into a
  preference the model may weigh away against something else. If the rule has real exceptions, name them. If it does
  not, state it flat.
- **The reason earns its place only when it generalizes.** In a one-shot request, motivation extends the rule to cases
  you did not enumerate. In persistent context, a reason that explains only the stated case is read on every turn and
  changes nothing.
- **Terse is not compressed.** Cut words that do not change meaning. A rule shortened past the point where its scope is
  clear costs more than the tokens it saved.

### Timelessness

Persistent instructions are read later by a reader that cannot discount them. A human meeting "not currently supported"
in an old document notices its age and downgrades the claim; a model reads a present-tense assertion from a
system-authority source and complies. **A stale instruction is not ignored — it is obeyed**, and nothing errors.

- **The runtime owns `now`; the text owns invariants.** Never assert a date, a live version, or a model roster in
  persistent context. The harness already injects the real current date, and your text competes with a channel that is
  always more current than it is.
- **Rolling referents are banned** — `currently`, `now`, `latest`, `newer`, `no longer`, `soon`, `still`,
  `does not yet`, `as of this writing`. Each names a moving target.
- **A rolling word is admissible only with a fixed anchor beside it** — a version range or a date. "Removed in current
  versions" rots; "removed in 3.0 and later" does not.
- **Domain time is preserved verbatim.** Durations, expiry, retry backoff, ordering, and migrations are part of what the
  subject does. The naive reading of this rule — delete temporal words — destroys meaning. The test is whether the
  referent moves with the reader, not whether the word looks temporal.
- **A plan is never written as a fact.** "Planned for Q4" stays modal. Canonicalizing it into "the product supports X"
  makes the prose cleaner and the claim false.
- **Time-stamped genres are exempt** — changelogs, release notes, migration guides, decision records, and evidence logs
  are dated by design. Keep them out of persistent context rather than de-tensing them.
- **Timeless is not immutable.** Hard invariants outlive model generations; soft defaults are calibrated against one and
  need re-examining when it moves. A file nobody revisits is not timeless, it is abandoned.

**This buys durability, not compliance.** Tense has no measured effect on instruction-following. Write timeless to keep
the artifact true, not to make the model obey harder.

Read [`${CLAUDE_SKILL_DIR}/references/timelessness.md`] when a temporal word is ambiguous between a moving referent and
domain time — it carries the deictic-vs-domain table, both-direction failure modes, and the evidence.

## Formatting

Sentence-level precision is not enough alone — the shape of the surrounding text decides whether the model reads a rule
as one thing or several.

### Choosing a data shape

- **Independent entries → key-value list.** Route tables, tool inventories, configuration mappings, permission modes.
  Each entry stands alone and nothing is gained by scanning across.
- **Genuine comparison → table.** Only where cross-criteria scanning is the point. **The test**: remove a column. If
  comparative meaning is lost it is a table; if the rows still stand alone it was a list wearing table formatting.
- **Nested structure → YAML.** Configurations and hierarchies beyond two levels. More accurate than JSON or XML at
  depth, and cheaper.
- **Ordered procedure → numbered list.** Only where sequence changes the outcome.
- **Everything else → bullets.** If items reorder without changing meaning, they are bullets.

Misusing a table for independent entries is the most common formatting defect and the cheapest to fix. Read
[`${CLAUDE_SKILL_DIR}/references/structured-data-formats.md`] when the shape choice is contested, or when an output
schema is being imposed — it carries selection depth and why a rigid schema costs reasoning quality.

### Marking regions with tags

Tags separate parts of a prompt a reader could otherwise run together — instructions, supplied data, examples, and the
output specification.

- **Tag where the prompt has parts that could be confused.** A single-purpose prompt gains nothing from tags and pays
  for them in noise.
- **One tag name per concept, reused exactly.** The same discipline as terminology: a region called `<context>` in one
  place and `<background>` in another reads as two regions.
- **Reference the tag from the instruction.** "Using the constraints in `<constraints>`" creates a link the model can
  follow. An unreferenced tag is decoration.
- **Nest for real hierarchy only.** Documents inside `<documents>`, each in its own `<document>`. Nesting that mirrors
  no actual structure adds depth without meaning.
- **Tags mark, they do not enforce.** A region labelled as data is still read, and labelling it does not stop
  instructions inside it from being followed. Where that matters, the boundary belongs in permissions or schema.

## Instructions compound with defaults

An instruction does not replace the model's default behavior. It adds to it. Where the two push the same direction, the
result overshoots — and the overshoot is invisible, because the output looks like compliance.

- **Delete verification instructions.** "Include a final verification step", "double-check your answer", "use a subagent
  to verify" stack on top of checking the model already does. Removing them costs nothing in quality.
- **Delete thoroughness nudges, forced progress scaffolding, and `if in doubt, use X`.** A model that reaches for a tool
  appropriately does not need telling; the nudge makes it reach when it should not.
- **The same trap runs the other way.** "Be concise" added to a model that is already terse produces answers too short
  to be useful. Whichever direction the default already points, a redundant instruction pushes past the useful amount.
- **Check the target model before generalizing.** Guidance for one model can say strip self-verification while guidance
  for another recommends explicit interval checks with fresh-context verifier subagents on long-horizon runs. Both hold;
  the split is by task horizon.

Read [`${CLAUDE_SKILL_DIR}/references/superseded-techniques.md`] before adopting a named technique — CoT, few-shot,
self-consistency, Tree-of-Thoughts, ReAct, PAL, Reflexion, personas, chaining, meta-prompting, APE, DSPy, XML tags,
prefilling — it says which are still worth reaching for.

## Instructions are followed exactly

An instruction is applied as written, to exactly the scope named, without the charitable interpretation a person would
supply. Reasonable-sounding instructions therefore produce unreasonable outcomes.

- **Separate finding from filtering.** "Only report high-severity issues" is obeyed literally — the model finds the bugs
  and then declines to report them. Ask for everything; filter downstream.
- **Every caution instruction is a threshold decision with a recall cost.** Stronger evidence-gating cut false answers
  by 30.6pp on one model while raising unnecessary abstention by 9.7pp on the same benchmark.
- **State scope explicitly.** The model will not infer that a rule extends past the item you named.

### Examples are read literally too

An example is not an illustration of what you want. It is a specification, and the model complies with **every**
property of it — including the ones you never decided.

- **Incidental properties become requirements.** If all your examples happen to have three bullets, you have specified
  three bullets. Length, ordering, field presence, register, punctuation, and depth all transfer whether or not you
  intended them. Nothing marks which parts were the point.
- **Vary what you do not want copied.** One example is a template; several that differ only in content are the same
  template stated three times. If the acceptable output spans a range, the examples must span it — otherwise you have
  demonstrated a point and asked for a space.
- **The last example weighs most.** Recency applies inside the example block. Put the most representative case last, not
  the most interesting one.
- **This is why examples narrow exploration.** The model reads a demonstrated approach as the approach to take and stops
  looking for a better one it would otherwise have found. Demonstrating _how to solve_ is the costly case; demonstrating
  _what the answer looks like_ is the safe one.
- **When output is consistently the wrong shape and examples are present, the examples are the cause.** Adding an
  instruction to correct it puts prose in conflict with a specification, and the specification wins.

## Quality checklist

- [ ] Confirmed this is a prompt problem — not effort, compaction, permissions, or code
- [ ] Surface identified before drafting; the rule is written for the surface it lands on
- [ ] Output contract explicit — format, length, and what "done" means
- [ ] Reasons given alongside rules, so they generalize
- [ ] No instruction pushing the same direction as a default the model already has
- [ ] Tool behavior in parameters, enums, and descriptions — not in prompt prose or usage examples
- [ ] Nothing restates what the agent can discover for itself
- [ ] Filtering separated from finding; no severity filter suppressing recall
- [ ] Delegated prompts self-contained, with a concrete output example
- [ ] Instruction count checked against what the context already holds, not against this file alone
- [ ] Key-value lists for independent entries; tables only where removing a column loses meaning
- [ ] Tags used only where parts could be confused, named consistently, referenced from the instruction
- [ ] Rules are imperative, one instruction per sentence, one term per concept
- [ ] No hedges — every rule states a boundary that can be checked from the output
- [ ] Defective prompt text encountered during the task was fixed or flagged once
- [ ] Every standing rule survives the deletion test and stays true over time
- [ ] No rolling referents; version-gated facts carry a fixed anchor
