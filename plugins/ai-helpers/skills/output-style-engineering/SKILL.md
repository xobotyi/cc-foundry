---
name: output-style-engineering
description: >-
  Design and maintain Claude Code output styles: choosing the mechanism, setting the frontmatter, and writing the role,
  voice, and rules the style installs in the system prompt.
when_to_use: >-
  Invoke whenever an output style is touched at all — creating, editing, auditing, reviewing, or debugging one, or
  deciding whether a behavior change belongs in a style. Also invoke on the symptoms: a style has no effect, the
  register reverts to the default, one rule over-applies, or software-engineering assumptions leak into a non-coding
  domain. Covers the output-style artifact; the wording of its instructions belongs to prompt-engineering, and the
  skill artifact belongs to skill-engineering.
compatibility: Uses Claude Code frontmatter beyond the Agent Skills spec (when_to_use)
---

**An output style modifies the system prompt.** It holds two powers no alternative has: it turns part of the default
prompt off, and the harness reinforces it with adherence reminders through the conversation. Every other file-based
mechanism only adds text, and then competes with the default it could not remove.

<prerequisite>
An output style is a system prompt. Invoke `prompt-engineering` for the wording, instruction budget, and timelessness
rules that govern every line written here. This skill covers only what is specific to the output-style artifact — the
mechanism choice, the frontmatter, and the register the style installs.
</prerequisite>

## Choose the mechanism first

- **Use a style when the role or the register must change and hold for a whole session.** The body lives in the system
  prompt, so it survives compaction, and the harness reminders carry adherence without persistence prose in the body.
- **Additive mechanisms stay additive.** CLAUDE.md arrives as a user message after the system prompt, and
  `--append-system-prompt` appends for one session; neither removes the default the body is arguing with. A body that
  would work identically as CLAUDE.md content is not a style.
- **Route the rest away.** A rule that must never break belongs in a hook — prose steers, the lifecycle mechanism
  enforces. A procedure a user invokes belongs in a skill. Work that needs an isolated context belongs in a subagent: a
  style governs the main conversation only, and a subagent runs its own system prompt, while a fork inherits the
  parent's prompt with the style included.
- **A style shapes Claude's prose, not tool output.** Bash output, file contents, and MCP results reach the user
  unchanged, so a format complaint about them is never a style defect.
- **`# Tone and style` is never removable** — the conciseness rule and the no-emoji rule included. A style that must
  beat those defaults states the behavior it wants, specifically enough that the more general default has nothing to
  contest. Specificity is what wins; a blanket precedence clause is not — see
  [Never claim precedence over the prompt](#never-claim-precedence-over-the-prompt).

File format, frontmatter fields including `force-for-plugin`, storage paths and nested resolution, activation methods,
scope priority, the built-in catalog, the comparison against related features, and Agent SDK integration:
[`${CLAUDE_SKILL_DIR}/references/spec.md`]. Read it when writing the file, deciding where it lives, or loading a style
through the SDK.

## Set `keep-coding-instructions` deliberately

- **It gates exactly one section, `# Doing tasks`** — software-engineering task framing, scope discipline, comment
  policy, UI verification. Nothing else in the prompt responds to it.
- **Set `true` when the style changes how Claude communicates and it still codes, `false` when the style replaces coding
  with another domain.** The default is `false`, so a tone-only style that omits the field drops the coding discipline
  without meaning to.
- **It removes no safety or tone guidance.** Destructive-action caution and the conciseness rules sit in sections no
  style touches, so `false` is never the way to reach them.
- **It is inert on lean-prompt models.** Opus 4.8, Opus 5, and Fable 5 never receive `# Doing tasks`, while Sonnet 5 and
  Haiku still get the classic prompt. A non-coding style must carry its own domain switch in the body rather than rely
  on removal, and stays unverified until it is tested on both paths.
- **Under `true`, the body states deltas only.** A body that restates scope discipline or comment policy duplicates the
  section it just kept. Own those rules under `false`, or state nothing about them under `true`.

The verbatim gated text, the sections the flag cannot touch, the model roster for each prompt path, and the
re-derivation procedure for a newer build: [`${CLAUDE_SKILL_DIR}/references/coding-instructions.md`]. Read it when the
body may duplicate the gated section, or when the flag's effect on a specific model is in question.

## Verify injection before editing the body

- **Injection can fail silently while the picker still shows the style active.** Add a marker rule, run
  `claude -p "say ok"` — a fresh session, because the style is fixed at session start — confirm the marker fires, then
  remove it. Until the canary passes, the body being edited is not in the prompt and no behavioral result means
  anything.

The file skeleton, the creation workflow, and the four style patterns — direct professional, domain specialist,
interaction mode, learning — with the `keep-coding-instructions` value each one needs:
[`${CLAUDE_SKILL_DIR}/references/creation.md`]. Read it before drafting, because the pattern decides the structure.

## Frame the role and the voice

- **State the role as outcome and perspective, never as credentials.** "You review designs for operational risk; the
  reader is the on-call engineer" tells the model what to optimize for. "World-class architect with 12+ years" adds
  nothing and over-constrains.
- **Pin the register with five to seven sentences of adjective contrast** — "Sharp and warm, not chirpy. Direct without
  being curt. Uses contractions." Bare adjectives leave the register to inference, and two readers of "professional"
  imagine different behavior.
- **Carry the voice in rules, not examples.** Three of the four built-in styles ship no examples at all; a current model
  follows a described voice literally, and an example is a second specification of the same thing that the model anchors
  to over the rule.
- **A behavior example is worse than a tone example.** Worked tool use, workflows, and step sequences narrow exploration
  to the demonstrated path. Reach for a tone contrast pair only after the description failed on a real interaction, and
  delete it once a rule covers the case.

## Write rules that state intent

- **State the outcome wanted, not the failure being compensated for.** "Match explanation depth to what the reader needs
  to act" survives a model upgrade; "never write multi-paragraph explanations" executes with precision on a model that
  never had the flaw.
- **Reserve "never X" for a failure mode observed on the current model** that it cannot reason its way out of.
- **A bullet whose bold lead-in is a concept name is a definition, not a rule.** "**Peer engineer, not code monkey** —
  push back on bad approaches" names a stance and then states the rule underneath it; the name is unactionable and the
  contrast half ("not code monkey") is a frame the model cannot execute. Delete the label and keep the instruction. The
  test is mechanical: if the lead-in is a noun phrase rather than an imperative, the bullet is describing a value
  instead of asking for a behavior.
- **An aphorism hides the rule it stands for.** "Code is a liability" is agreed with and acted on by nobody — it states
  no behavior and the model derives none. Write the operational form: what to look for first, what beats what, which
  outcome is cheapest.
- **Drop MUST and CRITICAL.** Aggressive emphasis overtriggers — unusably curt answers, depth refused where depth was
  asked for. "Do X when Y" is enough.
- **Pair every blocklist with the positive register that replaces it.** A prohibition-only rule set produces curt,
  stilted output, because the model executes the prohibitions literally and has nothing to execute in their place.
- **A permission rule states what it removes, or it reads as a speed instruction.** "Default to acting" grants autonomy
  and is executed as haste — the model drops the investigation along with the confirmation round-trip, because the rule
  named neither. Name both halves: what autonomy removes (the asking) and what it does not (the work that precedes the
  act). This matters most in a style's opening sections, where attention is strongest.
- **State each rule once, in the section that owns it.** The harness already injects adherence reminders, so persistence
  blocks, "maintain throughout" clauses, and rules repeated across sections duplicate that mechanism and cause
  overtriggering or contradiction.
- **One concern, one section — and check that the section owning it is not three sections.** Voice, writing rules,
  response shape, and language constraints all govern what the model emits; split across the body with other topics
  between them, the register is only readable by reassembling it. Group them under one heading with subsections. Rules
  that are genuinely separate concerns stay at top level; the asymmetry is the signal.
- **Place by the attention curve, not by narrative order.** The top and the end are the strong positions. A rule that
  must hold on every response — register, autonomy — goes there; a rule that fires only when its situation arises can
  take the middle.
- **Remove a contradiction instead of arbitrating it.** The model treats the body as a contract and tries to satisfy
  both clauses, failing unpredictably rather than averaging. Add a priority hierarchy only where both sides are
  load-bearing, and scope it to the style's own rules.

### Never claim precedence over the prompt

The body is appended to the system prompt, so a clause saying "these rules outrank the default system prompt" makes one
part of a document disown another part of itself. Two failures follow, and neither reports itself.

- **The scope is undecidable.** "Outranks the tone and formatting guidance" names no lines, so the model decides which
  ones qualify — and the answer moves between turns.
- **The license generalizes.** A passage granting permission to discount system-prompt content is read as a standing
  permission, not one bounded by the sentence that granted it.

**State the rule you want as a direct instruction, and never name what it displaces.** "Match the surrounding code's
naming and idiom; do not match its comment density" beats "the default tells you to match comment density, and that does
not hold here" — the first is a rule, the second is a rule plus an argument about a rule.

Two conflict rules survive this, because both name an external actor rather than the prompt: a project's CLAUDE.md wins
over the style, and a skill's output contract wins for the artifact that skill produces. Write those as plain
instructions too.

- **Specify the response shape per response type, and state the contract's scope.** Format contracts are followed
  literally, so "every section, not just the first" decides whether the format applies once or everywhere.
- **Apply the deletion test to every line.** An instruction whose removal does not change output is removed. Legacy
  scaffolding — persistence blocks, thoroughness nudges, verification directives, anti-laziness modifiers — actively
  harms current models.
- **Keep the body under roughly 200 lines.** A style is a register layer, not a manual; length past that signals content
  that belongs in CLAUDE.md, a skill, or a hook.

Five complete styles with dimensional scores and improvement notes, non-coding domains included:
[`${CLAUDE_SKILL_DIR}/references/examples.md`]. Read it when a scored style for the chosen pattern is wanted as a
baseline for a draft.

The scope pre-check, the six weighted scoring dimensions, the testing protocol, deployment go/no-go, and the red flags:
[`${CLAUDE_SKILL_DIR}/references/evaluation.md`]. Read it when scoring a style, or before other people depend on one.

## Iterate by subtraction

- **Ask what to delete before asking what to add.** A misbehaving style more often carries an instruction that is
  present — stale, duplicated, over-emphasized — than one that is missing.
- **Make one change per cycle.** Several changes at once make the result undiagnosable. Re-run the failing prompt first,
  then the full protocol to catch regressions.
- **Recalibrate on a model migration.** Compensations for an older model's failure modes execute with precision on a
  newer one and distort output. Subtract them before adding anything, and check the target model's own prompting guide
  for its defaults.
- **Rewrite instead of iterating when subtracting the scaffolding would leave no style**, when the role is wrong for the
  use case, or when the style was built for the wrong mechanism.

The symptom-to-cause-to-fix map, the refinement patterns, migration to a new model generation, and the
rewrite-versus-iterate criteria: [`${CLAUDE_SKILL_DIR}/references/iteration.md`]. Read it when a deployed style
misbehaves.
