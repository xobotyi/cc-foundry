# Output Style Evaluation

Framework for assessing output style quality before deployment.

## Scope Appropriateness

Before scoring dimensions, verify the style needs to exist as an output style. Output styles replace Claude's system
prompt — that power comes with cost (losing default behaviors, requiring full persona definition).

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

Six dimensions, each scored 1-10. Three are weighted 2x (persona, behaviors, examples) because they directly drive
compliance. The other three are supporting elements.

### 1. Persona Clarity (Weight: 2x)

Does the style define WHO Claude is?

- **1-3** — No persona, or vague ("be helpful"). Two readers would imagine different personas.
- **4-6** — Role defined but lacks specificity. "You are a senior engineer" without perspective, values, or constraints.
- **7-8** — Clear persona with role, domain expertise, and perspective. One-sentence summary is obvious.
- **9-10** — Rich persona with motivations, constraints, and values. Persona naturally implies behaviors without stating
  them.

**Checks:**

- Can you describe the persona in one sentence?
- Would two people reading the style imagine the same persona?
- Does the persona imply the right behaviors naturally?

### 2. Behavioral Specificity (Weight: 2x)

Are behaviors concrete and testable?

- **1-3** — Abstract instructions ("be professional", "communicate clearly"). Cannot verify compliance.
- **4-6** — Mix of concrete and abstract. Some rules are testable, others are aspirational.
- **7-8** — Mostly concrete, actionable instructions. Each rule has a clear pass/fail condition.
- **9-10** — All behaviors are specific, testable, and unambiguous. Includes both positive rules and explicit
  anti-patterns.

**Checks:**

- Could you write a pass/fail test for each rule?
- Are there concrete do/don't pairs?
- Do rules use specific language ("Never open with 'Great question!'") rather than vague directives ("Don't be
  sycophantic")?

### 3. Example Quality (Weight: 2x)

Do examples demonstrate expected behavior effectively?

- **1-3** — No examples. Behavior expectations are ambiguous.
- **4-6** — Examples present but limited — only positive examples, or only one scenario type.
- **7-8** — Multiple examples covering key scenarios. Includes contrast pairs (good vs bad).
- **9-10** — Comprehensive examples with contrast pairs across different interaction types (simple request,
  disagreement, complex task, emotional pressure).

**Checks:**

- Do examples show both correct and incorrect behavior (contrast pairs)?
- Do examples cover different interaction types, not just one?
- Would someone unfamiliar with the style learn the right tone from examples alone?

### 4. Output Format Clarity (Weight: 1x)

Is response structure explicitly defined?

- **1-3** — No format guidance. Response structure varies randomly.
- **4-6** — Some format hints but no templates or examples.
- **7-8** — Clear format with structure defined. Includes at least one response template.
- **9-10** — Explicit format with templates for different response types (simple answer, analysis, error case).

**Checks:**

- Would Claude know exactly how to structure any response type?
- Does format guidance scale across response complexity (one-liner vs detailed analysis)?

### 5. Consistency Safeguards (Weight: 1x)

Does the style prevent reversion to default behaviors?

- **1-3** — No safeguards. Will revert to defaults within a few turns.
- **4-6** — Some "avoid" instructions but no reinforcement strategy. Defaults will creep back mid-conversation.
- **7-8** — Clear anti-patterns with alternatives. Includes explicit persistence language ("maintain throughout entire
  conversation").
- **9-10** — Comprehensive safeguards: critical rules reinforced in multiple sections (persona, behaviors, examples,
  critical rules). Explicit persistence clause with enumerated reversion triggers.

**Checks:**

- Are common default behaviors explicitly forbidden with replacements?
- Does the style include persistence language for long conversations?
- Are critical rules reinforced through repetition across sections?

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
Score = (Persona x 2 + Behaviors x 2 + Examples x 2 +
         Format x 1 + Safeguards x 1 + Scope x 1) / 9
```

- **8-10** — Deploy. Style is robust and will hold across sessions.
- **6-7** — Minor refinements needed. Core is sound, edges need polish.
- **4-5** — Significant improvement needed. Multiple dimensions are weak.
- **1-3** — Major rewrite. Fundamental issues with persona, behaviors, or scope.

## Testing Protocol

After scoring dimensions, validate with real usage. Each test targets a specific failure mode observed in production.

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

### Non-Coding Domain Test (when applicable)

8. **SE assumption leak** — For styles with `keep-coding-instructions: false`, prompt: "Help me with [non-coding task]"
   — Any software engineering assumptions leaking? References to code, files, or technical tools that don't belong?

## Deployment Readiness

Go/no-go criteria for shipping a style:

**Go (all must be true):**

- Weighted score >= 6
- All core tests (1-4) pass
- Persistence test (6) shows no drift
- No red flags present (see below)
- `keep-coding-instructions` explicitly set (not relying on default)

**No-go (any one blocks deployment):**

- Weighted score < 4 on any 2x dimension (persona, behaviors, examples)
- Style reverts to defaults within 5 turns
- Any red flag present
- Style works identically without being a style (should be CLAUDE.md instead)

## Red Flags

Immediate issues requiring attention before deployment:

- **No persona definition** — inconsistent behavior across turns, nothing to anchor the style
- **Only positive instructions** — will revert to defaults without explicit anti-patterns and replacements
- **No examples** — ambiguous expectations, compliance is unpredictable
- **Contradictory rules without priority hierarchy** — Claude picks arbitrarily between conflicting instructions
- **Over 1000 lines** — instructions will be progressively ignored as context fills
- **No format guidance** — inconsistent output structure across responses
- **Style that doesn't leverage replacement** — body could work as CLAUDE.md content, wasting the style mechanism
- **No consistency safeguards** — style will drift within a few turns, especially under emotional pressure
- **Missing `keep-coding-instructions` decision** — relying on default (`false`) without considering whether the style
  needs coding capabilities
