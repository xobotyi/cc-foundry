# Output Style Evaluation

Framework for assessing output style quality.

## Evaluation Dimensions

### 1. Persona Clarity (Weight: High)

Does the style define WHO Claude is clearly?

| Score | Criteria |
|-------|----------|
| 1-2 | No persona defined, or vague ("be helpful") |
| 3-4 | Basic persona but lacks specificity |
| 5-6 | Clear persona with role and domain |
| 7-8 | Detailed persona with expertise and perspective |
| 9-10 | Rich persona with motivations, constraints, values |

**Check:**
- Can you describe the persona in one sentence?
- Would two people reading the style imagine the same persona?

### 2. Behavioral Specificity (Weight: High)

Are behaviors concrete and actionable?

| Score | Criteria |
|-------|----------|
| 1-2 | Abstract instructions ("be professional") |
| 3-4 | Some concrete rules, most vague |
| 5-6 | Mix of concrete and abstract |
| 7-8 | Mostly concrete, actionable instructions |
| 9-10 | All behaviors are specific, testable, unambiguous |

**Check:**
- Could you verify compliance for each rule?
- Are there concrete do/don't examples?

### 3. Example Quality (Weight: High)

Do examples demonstrate expected behavior effectively?

| Score | Criteria |
|-------|----------|
| 1-2 | No examples |
| 3-4 | Examples present but don't show tone clearly |
| 5-6 | Good examples but limited coverage |
| 7-8 | Multiple examples covering key scenarios |
| 9-10 | Comprehensive examples with contrast (good vs bad) |

**Check:**
- Do examples show both correct and incorrect behavior?
- Do examples cover different interaction types?

### 4. Output Format Clarity (Weight: Medium)

Is response structure explicitly defined?

| Score | Criteria |
|-------|----------|
| 1-2 | No format guidance |
| 3-4 | Vague format hints |
| 5-6 | Some format specified |
| 7-8 | Clear format with structure defined |
| 9-10 | Explicit format with templates and examples |

**Check:**
- Would Claude know exactly how to structure responses?
- Are there format templates for different scenarios?

### 5. Consistency Safeguards (Weight: Medium)

Does the style prevent reversion to default behaviors?

| Score | Criteria |
|-------|----------|
| 1-2 | No safeguards, likely to revert |
| 3-4 | Minimal guidance on avoiding defaults |
| 5-6 | Some explicit "avoid" instructions |
| 7-8 | Clear anti-patterns with alternatives |
| 9-10 | Comprehensive safeguards with reinforcement |

**Check:**
- Are common default behaviors explicitly forbidden?
- Are alternatives provided for forbidden behaviors?

### 6. Appropriate Scope (Weight: Medium)

Is the style focused without being too narrow?

| Score | Criteria |
|-------|----------|
| 1-2 | Too broad (tries to cover everything) or too narrow |
| 3-4 | Scope unclear |
| 5-6 | Reasonable scope but some ambiguity |
| 7-8 | Well-defined scope for intended use case |
| 9-10 | Perfect scope with clear boundaries |

**Check:**
- Is `keep-coding-instructions` set appropriately?
- Does the style know what it's for (and not for)?

---

## Quick Evaluation Checklist

### Must Have (Critical)

- [ ] Persona defined (who is Claude?)
- [ ] Core behaviors listed explicitly
- [ ] At least one tone example
- [ ] Output format specified

### Should Have (Important)

- [ ] Multiple examples showing contrast
- [ ] Explicit "avoid" list
- [ ] Format templates for common scenarios
- [ ] `keep-coding-instructions` considered

### Nice to Have (Polish)

- [ ] Edge case handling
- [ ] Multi-turn conversation guidance
- [ ] Domain-specific terminology defined
- [ ] Escalation patterns (when to break style)

---

## Scoring Guide

Calculate weighted score:

```
Score = (Persona × 2 + Behaviors × 2 + Examples × 2 +
         Format × 1 + Safeguards × 1 + Scope × 1) / 9
```

**Why the weights?** Persona, behaviors, and examples are weighted 2×
because they directly control Claude's compliance. Format, safeguards,
and scope are supporting elements that reinforce the core three.

| Total Score | Quality Level | Action |
|-------------|---------------|--------|
| 8-10 | Excellent | Deploy |
| 6-7 | Good | Minor refinements |
| 4-5 | Adequate | Needs improvement |
| 1-3 | Poor | Major rewrite needed |

---

## Common Deficiencies

### Vague Persona

**Problem:** "Be helpful and professional"
**Fix:** "You are a senior engineer who values precision over
politeness and always provides rationale"

### Abstract Behaviors

**Problem:** "Communicate clearly"
**Fix:** "Open with the answer. Then provide rationale. Never
exceed 3 paragraphs unless asked."

### Missing Examples

**Problem:** Behaviors described but never demonstrated
**Fix:** Add input/output pairs showing exact tone expected

### No Anti-Patterns

**Problem:** Style says what to do but not what to avoid
**Fix:** Add explicit "Avoid" section with common bad patterns

### Missing Format

**Problem:** No guidance on response structure
**Fix:** Add format templates for different request types

---

## Testing Protocol

After evaluation, validate with real usage:

### Test 1: First Impression

Prompt: "Hello, can you help me?"

**Check:**
- Does opener match style?
- Any sycophantic language?

### Test 2: Simple Task

Prompt: "Summarize [topic]"

**Check:**
- Format matches specification?
- Tone consistent?

### Test 3: Disagreement

Prompt: "I think [obviously wrong thing] is correct"

**Check:**
- Does Claude push back appropriately?
- Maintains style while disagreeing?

### Test 4: Complex Request

Prompt: "[Multi-step problem]"

**Check:**
- Style holds under complexity?
- No reversion to defaults?

### Test 5: Stress Test

Prompt: "Please help me, I'm really stuck and frustrated!"

**Check:**
- Maintains style under emotional pressure?
- Appropriate empathy without sycophancy?

---

## Red Flags

Immediate issues requiring attention:

| Red Flag | Risk |
|----------|------|
| No persona definition | Inconsistent behavior |
| Only positive instructions | Will revert to defaults |
| No examples | Ambiguous expectations |
| Contradictory rules | Unpredictable responses |
| Over 1000 lines | Instructions will be ignored |
| No format guidance | Inconsistent output |
