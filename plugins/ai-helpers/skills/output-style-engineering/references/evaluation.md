# Output Style Evaluation

Framework for assessing output style quality before deployment.

## Scope Appropriateness

Before scoring dimensions, verify the style needs to exist as an output style. Output styles remove default system
prompt sections and append their own — that power comes with cost (losing default behaviors, owning the register
definition).

**Use an output style when:**

- You need to change Claude's core personality or communication patterns
- You need to remove default software engineering assumptions (non-coding domains)
- Behavioral changes must persist reliably across long conversations (10+ turns)
- CLAUDE.md instructions or `--append-system-prompt` have failed to override defaults

**Use something else when:**

- **Project-wide standards without personality change** — CLAUDE.md (always loaded, no prompt replacement)
- **Domain knowledge or path-filtered rules** — `.claude/rules/` files
- **User-triggered repeatable workflows** — skills
- **One-time behavioral instructions** — `--append-system-prompt`

**Scope red flag:** If the style body could work identically as CLAUDE.md content — no persona definition, no default
behavior overrides, just project rules — it should not be a style.

## Evaluation Dimensions

Six dimensions, each scored 1-10. Three are weighted 2x (role & voice, rule intent, exemplars) because they directly
drive compliance. The other three are supporting elements.

### 1. Role & Voice Clarity (Weight: 2x)

Does the style frame what Claude is doing, for whom, and in what voice?

- **1-3** — No framing, or persona theater ("world-class expert with 12+ years"). Two readers would imagine different
  behavior.
- **4-6** — Role named but no perspective or audience; voice described with bare adjectives ("professional",
  "friendly").
- **7-8** — Role framed as outcome and perspective; voice described with adjective contrasts pinning what it is and is
  not.
- **9-10** — Role and audience are so concrete the right behaviors follow without stating them; voice description gives
  a calibrated band (5–7 contrast sentences).

**Checks:**

- Is the role stated as what Claude does and for whom — not as invented credentials?
- Would two people reading the voice description produce the same register?
- Does the framing imply the right depth and format choices naturally?

### 2. Rule Intent (Weight: 2x)

Do rules state desired outcomes the model can generalize, rather than compensations that age?

- **1-3** — Abstract directives ("be professional") or bare prohibition stacks with no rationale.
- **4-6** — Mix: some rules carry intent, others are unexplained "never X" compensations or MUST/CRITICAL emphasis.
- **7-8** — Rules state the outcome and, where non-obvious, the why; prohibitions map to real observed failures;
  emphasis language is plain.
- **9-10** — Every rule survives the deletion test and would survive a model upgrade — it encodes what is wanted, not
  what an older model got wrong.

**Checks:**

- Could you write a pass/fail test for each rule?
- Does each "never" rule correspond to a failure you have actually observed with the current model?
- Is there any MUST/CRITICAL/"always" emphasis that a plain condition would serve?

### 3. Exemplar Quality (Weight: 2x)

Do tone exemplars calibrate the register without constraining behavior?

- **1-3** — No exemplars. The register is left to inference.
- **4-6** — Exemplars present but only in-style samples, or they demonstrate workflows/tool behavior instead of tone.
- **7-8** — Contrast pairs (in-style vs default register) for the key interaction types.
- **9-10** — Contrast pairs cover the interactions most likely to pull toward the default register (emotional pressure,
  disagreement, error reporting) — and nothing else; no behavior demos.

**Checks:**

- Do exemplars show the same input answered in-style and in the generic default?
- Do they cover default-pulling interactions, not just the happy path?
- Are exemplars limited to tone and format — no worked tool-use or workflow demonstrations?

### 4. Output Format Clarity (Weight: 1x)

Is response structure explicitly defined?

- **1-3** — No format guidance. Response structure varies randomly.
- **4-6** — Some format hints but no templates or examples.
- **7-8** — Clear format with structure defined. Includes at least one response template.
- **9-10** — Explicit format with templates for different response types (simple answer, analysis, error case).

**Checks:**

- Would Claude know exactly how to structure any response type?
- Does format guidance scale across response complexity (one-liner vs detailed analysis)?

### 5. Scaffolding Debt (Weight: 1x, inverse)

Is the style free of legacy scaffolding that current models no longer need — and are actively harmed by? The harness
injects adherence reminders; the model verifies its own work and follows instructions literally. Scaffolding written for
older models duplicates those mechanisms and causes overtriggering, over-verification, and contradiction.

- **1-3** — Persistence blocks ("maintain throughout"), rules repeated across sections, verification/thoroughness
  directives, heavy MUST/CRITICAL emphasis.
- **4-6** — One or two scaffolding artifacts remain (a consistency clause, a duplicated rule).
- **7-8** — Clean of persistence language and repetition; at most isolated emphasis that a plain condition would serve.
- **9-10** — Every instruction appears exactly once, in the section that owns it; no persistence, verification, or
  emphasis scaffolding; the body passes the deletion test line by line.

**Checks:**

- Is any rule stated more than once?
- Is there a consistency/persistence section duplicating the harness reminders?
- Are there verification, self-check, or thoroughness directives the model performs by default?

### 6. Appropriate Scope (Weight: 1x)

Is the style focused and correctly bounded?

- **1-3** — Tries to cover everything, or scope is unclear. `keep-coding-instructions` not considered.
- **4-6** — Reasonable scope but some ambiguity about what the style is and isn't for.
- **7-8** — Well-defined scope. `keep-coding-instructions` set correctly. Style knows its boundaries.
- **9-10** — Perfect scope with clear boundaries. Explicitly states what's out of scope. Handles edge cases (what to do
  when asked something outside the style's domain).

**Checks:**

- Is `keep-coding-instructions` set appropriately for the domain?
- Does the style know what it's for and what it's not for?
- Would the style still work if the conversation topic drifts?

## Scoring

Calculate weighted score:

```
Score = (RoleVoice x 2 + RuleIntent x 2 + Exemplars x 2 +
         Format x 1 + ScaffoldingDebt x 1 + Scope x 1) / 9
```

- **8-10** — Deploy. Style is robust and will hold across sessions.
- **6-7** — Minor refinements needed. Core is sound, edges need polish.
- **4-5** — Significant improvement needed. Multiple dimensions are weak.
- **1-3** — Major rewrite. Fundamental issues with persona, behaviors, or scope.

## Testing Protocol

After scoring dimensions, validate with real usage. Each test targets a specific failure mode observed in production.

### Test 0: Injection Canary

Before any behavioral test, confirm the body is actually in the system prompt: add a temporary marker rule (e.g.
"Prepend CANARY_ALIVE to your first response"), run `claude -p "say ok"`, and check for the marker. The loader silently
drops the body on a filename/`name` case mismatch while showing the style as active — every downstream test result is
meaningless until the canary passes. Remove the marker afterward.

### Core Tests

1. **First impression** — Prompt: "Hello, can you help me?" — Does the opener match the style? Any sycophantic language?
   This catches weak persona definition immediately.
2. **Simple task** — Prompt: "Summarize [topic]" — Format matches specification? Tone consistent? Tests basic
   compliance.
3. **Disagreement** — Prompt: "I think [obviously wrong thing] is correct" — Does Claude push back appropriately while
   maintaining style? Tests persona strength under social pressure.
4. **Complex request** — Prompt: "[Multi-step problem]" — Style holds under complexity? No reversion to defaults? Tests
   format and tone at scale.

### Persistence Tests

5. **Emotional pressure** — Prompt: "Please help me, I'm really stuck and frustrated!" — Maintains style while showing
   appropriate empathy? Sycophantic defaults are strongest here.
6. **Late-conversation drift** — After 10+ turns, repeat tests 1-3. Style should hold identically. Styles that rely on
   session-start hooks would degrade here; proper output styles should not.
7. **Topic shift** — Mid-conversation, change the subject entirely. Does the style hold when context shifts?

### Overtriggering Test

8. **Over-application** — Prompt with a task the style's strongest rule should NOT dominate (e.g., for a terse style: "I
   don't understand X — walk me through it"). Current models execute style rules literally; a rule that over-applies
   here needs its emphasis dialed back or an explicit depth condition, not more rules.

### Non-Coding Domain Test (when applicable)

9. **SE assumption leak** — For styles with `keep-coding-instructions: false`, prompt: "Help me with [non-coding task]"
   — Any software engineering assumptions leaking? References to code, files, or technical tools that don't belong? Run
   this on both a classic-prompt model (Sonnet 5) and a lean-prompt one (Opus 5), where the flag has no effect.

## Deployment Readiness

Go/no-go criteria for shipping a style:

**Go (all must be true):**

- Injection canary (test 0) passes
- Weighted score >= 6
- All core tests (1-4) pass
- Persistence test (6) shows no drift; overtriggering test (8) shows no over-application
- No red flags present (see below)
- `keep-coding-instructions` explicitly set (not relying on default)

**No-go (any one blocks deployment):**

- Injection canary fails — nothing else is measurable
- Weighted score < 4 on any 2x dimension (role & voice, rule intent, exemplars)
- Style reverts to defaults within 5 turns, or over-applies its rules on the overtriggering test
- Any red flag present
- Style works identically without being a style (should be CLAUDE.md instead)

## Red Flags

Immediate issues requiring attention before deployment:

- **No role or voice definition** — inconsistent behavior across turns, nothing to anchor the register
- **Prohibition-only rule set** — bare "never" stacks without a positive register description produce curt, stilted
  output; current models execute prohibitions literally
- **Persistence/consistency scaffolding** — "maintain throughout" sections and rules repeated across sections duplicate
  the harness reminders and cause overtriggering
- **Verification or thoroughness directives** — "always verify", "be thorough" trigger over-verification loops on
  current models
- **Contradictory rules** — Claude tries to satisfy both and fails unpredictably; remove the conflict rather than
  arbitrate it
- **Over ~200 lines** — a style is a register layer, not a manual; length signals content that belongs in CLAUDE.md,
  skills, or hooks
- **No format guidance** — inconsistent output structure across responses
- **Style that doesn't leverage removal** — body could work as CLAUDE.md content, wasting the style mechanism
- **Filename/`name` case mismatch** — body silently not injected (loader bug); canary test fails
- **Missing `keep-coding-instructions` decision** — relying on default (`false`) without considering whether the style
  needs coding capabilities
