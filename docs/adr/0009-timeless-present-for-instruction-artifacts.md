# 0009 — Instruction artifacts are written in the timeless present

- **Status:** accepted
- **Date:** 2026-08-28

## Context

A SKILL.md is written once and read for months by a model that treats system-authority content as fact. The world moves
underneath it — models ship, parameters get removed, defaults flip — and the file does not.

A human reader handles this. Meeting "not currently supported" in a two-year-old document, they notice its age and
downgrade the claim to a hypothesis. A model does not: instruction hierarchy places the text above its own knowledge,
and the knowledge-conflict literature finds models highly receptive to coherent, authoritative in-context claims even
when those contradict what they know. **A stale instruction is not ignored. It is obeyed.**

An audit on this date found **38 rolling model referents** in `plugins/ai-helpers` — "current models", "current
generation", "newer models", "latest models" — concentrated in `prompt-engineering/references/claude-specific.md`,
`model-behavior.md`, and four files under `output-style-engineering`. Every one names a moving target and silently
becomes false. Rolling words outside that phrase (`currently`, `no longer`, `now supports`) reach further, into `rust`,
`the-coder`, `the-blueprint`, `infrastructure`, and `grafana`.

The calibration matters more than the count, because the obvious justification for this rule is wrong. **Tense has no
measured effect on instruction-following.** Leidinger et al. varied tense, mood, aspect, and modality across
semantically equivalent prompts and found the effects mixed and model-dependent. Anyone adopting this as a compliance
trick is adding a false finding to a library that has spent commits removing them. The payoff is durability of the
artifact, and durability alone is sufficient reason.

Concept, evidence, and prior art (Google's named rule, Grafana's `Grafana.Timeless` lint rule, and ElevenLabs' skill
library arriving at the same conclusion independently): [`docs/timeless-present.md`](../timeless-present.md).

## Decision

Text that is loaded into a model's context as instruction is written so that no sentence depends on when it is read. Two
rules, in order of importance.

**Admission.** A statement enters a persistent artifact only if changing it would mean changing intended behavior.
Volatile facts — dates, live versions, rosters, prices, repo state — come from runtime injection or retrieval instead.
The prompt-cache breakpoint is the mechanical test: content that cannot sit behind one does not belong in the artifact,
and misplacement costs cache hits before it costs correctness.

**Phrasing.** Rolling referents are banned: `currently`, `now`, `new`, `newer`, `latest`, `recent`, `soon`,
`eventually`, `no longer`, `still`, `does not yet`, `as of this writing`, `at present`. A rolling word is admissible
only when a fixed anchor sits beside it — a version range, a model set, or a date. "Removed on current models" rots;
"returns 400 on Claude 4.6+" does not.

This is not "delete temporal words". Domain time — durations, expiry, retry backoff, ordering, migrations — is part of
what the subject does and is preserved verbatim. A plan keeps its modality and is never promoted to fact.

Scope is instruction context: SKILL.md, `references/`, CLAUDE.md, output styles, agent definitions, hook prompts.
Time-stamped genres are exempt and stay that way — commit messages, GitHub release notes, ADRs (which carry a `Date:`),
and the dated research syntheses in `docs/`.

## Consequences

- The 38 referents in `ai-helpers` are corrected by anchoring, not deletion — most files already state the version set
  they mean a few lines away.
- `prompt-engineering` gains a `Timelessness` section and checklist items, since it is the skill that teaches prompt
  authoring. `skill-engineering`, `output-style-engineering`, and `the-workflow:claude-md` inherit the rule.
- `references/model-behavior.md` is inherently version-bound and stays that way. It already anchors at the file level
  ("the current generation (July 2026)"); the rule is that every claim inside it earns the same treatment.
- Version-gated facts now carry maintenance cost: an anchored claim must be revisited when the anchor moves. This is the
  intended trade — a stale anchored claim is visibly stale, while a stale rolling claim reads as current.
- Compliance is greppable. A fixed banned-word list can be audited by a reviewer or a hook, the way `Grafana.Timeless`
  is enforced by a linter; "write timelessly" could not be audited by anything.
- Timeless is not immutable. Hard invariants outlive model generations; soft defaults are calibrated against one and
  need re-examination when it moves. A file nobody revisits is not timeless, it is abandoned — this ADR does not license
  treating instruction text as finished.
