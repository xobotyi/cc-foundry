---
name: skill-engineering
description: >-
  Author and maintain Agent Skills: routing metadata, body content, bundled references and scripts, evaluation, and
  distribution.
when_to_use: >-
  Invoke whenever a skill is touched at all — creating, editing, auditing, reviewing, or debugging one, or deciding
  whether one should exist. Also invoke on the symptoms: a skill never activates, fires on the wrong request, loads
  but stops steering, or fails to survive compaction. Covers the skill artifact; the wording of the instructions
  inside it belongs to prompt-engineering.
compatibility: Uses Claude Code frontmatter beyond the Agent Skills spec (when_to_use)
---

<prerequisite>
A skill is instruction text. Invoke `prompt-engineering` for the wording, instruction budget, and timelessness rules
that govern every line written here. This skill covers only what is specific to the skill artifact — routing metadata,
packaging, progressive disclosure, and evaluation.
</prerequisite>

**A skill stabilizes a procedure the agent performs unreliably.** It is not a place for knowledge the model already has,
and it is not documentation. Value concentrates in procedural anchoring — setup order, tool sequence, the check that
catches a specific failure — not in explanation.

## Decide whether the behavior belongs in a skill

- **Write a skill only where the model fails the procedure without it.** Skills pay off where the model is weak and cost
  where it is already competent: a skill on a task the model already handles adds tokens, adds an applicability judgment
  it can get wrong, and narrows the recovery path it would otherwise have found.
- **One skill per procedure a user would name in a single request.** If one request needs two of these skills, they are
  one skill; if one skill answers two unrelated requests, it is two.
- **Put a prohibition that must hold every time in a hook.** Prose steers; the host's lifecycle mechanism enforces.
- **Put work that needs a clean context and returns a summary in a subagent**, and connection to an external system in a
  tool or server. Skills carry procedure; tools carry capability.

Archetype and scoping — the workflow, knowledge, and coding-discipline shapes with their structural templates, the
scope-sizing tests, negative triggers, and skill composition: [`${CLAUDE_SKILL_DIR}/references/archetypes.md`]. Read it
before writing the body, because the archetype decides the structure.

## Write the description as routing code

The description is the only part of a skill that is always in context, and it is where most skills fail: over half of
public skills carry routing metadata that cannot route.

- **Use the form `[Verb] [what]. Use when [trigger].`** A description that says only what the skill does gives the model
  nothing to fire on.
- **Discriminate against the neighbors.** Name the boundary that separates this skill from the sibling that matches the
  same words. Selection precision collapses as the candidate pool grows — from roughly 30% at five candidates to a few
  percent at a hundred — so a description competes, it does not merely describe.
- **Front-load the use case and keep it under 250 characters.** Listings are budgeted and truncate.
- **Write the triggers in the words a user would type**, including the case where the user never names the domain.
- **Keep routing information out of the body and write it in third person.** The body is read after the routing decision
  is made, and a mixed point of view degrades discovery.

## Prefer proscriptive content

Slice ablation on skills measured to help: anti-pattern rules are the only content type with a directionally reliable
effect. Positive rules are neutral. Worked examples are the most expensive slice by token count.

- **Write the gotcha, not the tutorial.** An environment-specific fact that defies a reasonable assumption is the
  highest-value line in a skill — the field named one thing in one service and another in the next, the endpoint that
  returns success while the work silently failed, the table that is append-only.
- **Build the gotchas from observed failures.** Every correction made while the skill runs is a candidate line. This is
  the most direct way to improve a skill.
- **Encode knowledge local to a repository, framework, or service.** Content the model could generate on demand earns
  nothing; the trait that separates high-quality public skills is knowledge it could not.
- **Delete anything the model already does.** A rule that changes nothing costs the same as one that changes everything.
- **Give one default with an escape hatch, never a menu**, and do not repeat the skill name as a heading.

## Calibrate prescriptiveness against fragility

Prescription buys consistency and pays in recoverability. After a first-attempt mistake, prescriptive content restricts
the recovery path the model would otherwise have taken — which is why degradation concentrates on tasks the model was
already going to pass.

- **Prescribe where a wrong order or a wrong flag causes damage that is not automatically recoverable** — a migration
  sequence, a destructive operation, a released artifact. State that the sequence is exact.
- **Give constraints instead of steps everywhere else**, and let the model pick the path.
- **Omit worked examples when the target is a frontier model.** In one ablation the same example slice moved mid-tier
  models several points up and the strongest model fifteen points down, by suppressing its own better priors. An output
  template is safe — it pins a shape without demonstrating an approach.

## Split by load condition, not by topic

The body loads on every activation and stays in context; bundled files cost nothing until read. Mandatory body text is
where context cost concentrates — in one failure analysis, body bloat accounted for 43 of 46 context-overhead
regressions while supplementary material accounted for 3.

- **Keep in the body only what applies on every run.** Everything conditional belongs in a bundled file.
- **State the condition that loads each file** at the point the condition arises. "Read the API-errors reference when
  the API returns a non-200 status" works; "see `references/` for details" does not. Whether a reference is ever read is
  unmeasured, so an unconditioned pointer is a guess.
- **Keep references one level deep and name each file for its content.** Put templates and static resources in
  `assets/`.
- **Bundle a script for a deterministic operation, or for work that transcripts show being reinvented.** Script code
  never enters context; only its output does.
- **Make execution intent unmistakable.** "Run `scripts/x.py`" and "see `scripts/x.py` for the algorithm" must not be
  confusable, because some hosts read a bundled script where others execute it.

Packaging and cross-host limits — the six-field portable contract, the plugin package format, where extra frontmatter
causes a hard error, distribution scopes: [`${CLAUDE_SKILL_DIR}/references/portability.md`]. Read it before shipping a
skill to a host other than the one it was written on.

Host behavior — the full frontmatter field set, the listing budget and its truncation order, content lifecycle and
compaction limits, invocation control, per-turn permissions, substitutions, dynamic context injection, forked execution,
precedence, version gates: [`${CLAUDE_SKILL_DIR}/references/claude-code.md`]. Read it when authoring for Claude Code or
debugging why a skill does not activate.

## Verify against a baseline

- **Run the host's structural validator on every change.** It is cheap and catches the defects that stop a skill loading
  at all. It does not predict whether the skill helps: measured against live effect, structural and judge scores both
  correlate at approximately zero.
- **Measure activation and behavior separately before other people depend on the skill**, each against a no-skill
  baseline in a fresh session. Use the host's own eval tooling; where none is available, say the skill is unmeasured
  rather than building a harness.
- **Check the new rules against the rules already loaded.** The executing model resolves contradictions with judgment,
  which is what stops it from reporting them — so its silence is not evidence of consistency. Test in a fresh context,
  or with a different model than the one that will execute.
- **Condition the verification a skill prescribes on task uncertainty, change size, and risk.** Mandatory verification
  is the largest measured source of cost regression — skills turn optional checks into work performed every time. Where
  correctness is machine-checkable, prescribe a validation loop whose errors name the offending value and the accepted
  set.

Trigger sets, near-miss negatives, assertion design, grading, the iteration loop, and the available tooling:
[`${CLAUDE_SKILL_DIR}/references/evaluation.md`]. Read it when measuring or tuning a skill.

## Maintain against the substrate

- **Re-measure on a model or host upgrade.** A skill decays without being edited: as the baseline model improves, its
  marginal value shrinks while absolute performance stays high. A skill can be well written and not worth loading.
- **Treat utility as specific to one model.** Per-pair utility is near-uncorrelated across model backends, and most
  skill-task pairs help on one model and hurt on another. A single ranking does not transfer.
- **Delete a skill that stops earning its slot.** Every installed skill costs listing budget and competes for selection
  against its neighbors.

What not to ship, how to review a third-party skill, scanner blind spots, and the permission hazards a checked-in skill
carries: [`${CLAUDE_SKILL_DIR}/references/security.md`]. Read it before publishing a skill or installing one.
