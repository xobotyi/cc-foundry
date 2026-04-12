# Skill Iteration

Skills improve through observation and refinement. Apply prompt engineering debugging techniques — when Claude doesn't
follow instructions, the prompt needs work, not stronger language.

## Iteration Cycle

```
Use skill → Observe behavior → Identify gap → Refine → Repeat
```

## Activation Reliability

### Why Activation Fails

Skill selection is pure LLM reasoning: Claude reads the `<available_skills>` list in the Skill tool's description and
decides which to invoke. There is no algorithmic matching, no embeddings, no intent classifier. This creates specific
failure modes:

- **Keyword gap** — Claude does shallow pattern matching at activation. Specific terms (`$state`, `command()`) activate
  every time; conceptual queries miss 60-80% of the time.
- **Context window pressure** — Long conversations push skill checks to lower priority as context fills.
- **Token budget truncation** — Available skills live in a budget of 1% of the context window (fallback: 8K chars)
  inside the Skill tool description. Too many skills → truncation → invisible to Claude.
- **Passive suggestion ignored** — Simple hook instructions are background noise. Claude acknowledges them mentally and
  proceeds without acting.

### Activation Rate Benchmarks

Community research across 250+ sandboxed evaluations (Claude Haiku 4.5, four SvelteKit skills, five prompt categories,
10 runs each):

- **No hook (baseline):** ~20-55% activation (varies by model and prompt specificity)
- **Simple instruction hook:** ~20-50% — no meaningful improvement over baseline
- **Native `type: "prompt"` hook:** same as no hook — gets deprioritized
- **LLM eval hook** (API pre-screening with Haiku): 80% overall; 100% on simple single-skill prompts, 0% on multi-skill
  prompts
- **Forced eval hook** (explicit YES/NO per skill): 84% overall; never completely failed a prompt category

### Why Forced Eval Works: The Commitment Mechanism

Simple hooks are passive suggestions. Forced eval creates a three-step process:

1. **Show work** — Claude must explicitly evaluate each available skill
2. **Make commitment** — State YES or NO for each, with reason
3. **Follow through** — Cannot skip to implementation without completing the evaluation

Once Claude writes "YES — need reactive state" in its response, it is committed to activating that skill. Aggressive
language in the hook prompt (MANDATORY, CRITICAL, WORTHLESS) reinforces compliance.

Forced vs LLM eval trade-offs:

- **Forced eval** — 84% activation, no external dependencies, verbose output (Claude lists all skills before working),
  most consistent across all prompt types
- **LLM eval** — 80% activation, 10% cheaper per prompt, 17% faster latency, can fail catastrophically on some prompt
  types (0% on multi-skill prompts in testing), requires API key

### Description Optimization Tiers

Improving the skill description improves Claude's autonomous matching before any hook is involved:

- **Tier 1 (~50% activation):** Clear `USE WHEN` patterns, specific keywords and term names, file type mentions
- **Tier 2 (~60-70% activation):** CLAUDE.md references pointing to the skill, workflow documentation that mentions the
  skill by name
- **Tier 3 (84-100% activation):** Custom hooks with forced evaluation or LLM pre-screening

Description alone will not reliably reach Tier 3. Hooks are the only path to consistent activation.

For details on implementing hooks, see the
[troubleshooting reference](${CLAUDE_SKILL_DIR}/references/troubleshooting.md).

## Common Activation Fixes

- **Doesn't trigger** — description misses the user's words. Fix: broaden domain claim, add trigger keywords, add
  `USE WHEN` pattern
- **Triggers too often** — description too broad. Fix: add exclusions: "Use for X, NOT for Y"
- **Wrong skill activates** — overlapping descriptions. Fix: make descriptions more distinct, add exclusions on both
  skills
- **Inconsistent triggering** — conceptual queries miss, literal queries hit. Fix: add more phrasing variants in
  description, or implement forced eval hook

## Common Output Fixes

- **Wrong format** — no format specification. Fix: add explicit format with example output
- **Missing details** — instructions vague. Fix: be specific: "Include X, Y, Z"
- **Ignores instructions** — buried in prose. Fix: move to end, use XML tags, add structure
- **Inconsistent quality** — ambiguous guidance. Fix: add few-shot examples, resolve conflicts
- **Partial completion** — steps unclear. Fix: use numbered sequential steps
- **Ignores constraints** — not emphasized. Fix: place in `<constraints>` tags at end

## Refinement Patterns

### Restructuring with XML Tags

Before:

```markdown
Filter out test accounts when querying. Also validate
input and check permissions before running.
```

After:

```markdown
<constraints>
- ALWAYS filter test accounts: `WHERE account_type != 'test'`
- Validate input format before processing
- Check permissions before write operations
</constraints>
```

### Adding Explicit Format

Before:

```markdown
Return the analysis results.
```

After:

```markdown
<output_format>
Return as JSON:
\`\`\`json
{"summary": "...", "findings": [...], "confidence": "high|medium|low"}
\`\`\`
</output_format>
```

### Moving Critical Rules to End

Before (buried in middle):

```markdown
## Process
1. Read input
2. NEVER delete without confirmation
3. Transform data
4. Write output
```

After (at end):

```markdown
## Process
1. Read input
2. Transform data
3. Write output

## CRITICAL
NEVER delete without explicit user confirmation.
```

### Broadening Domain Claim

Before — narrow verb list:

```yaml
description: >-
  Process PDF files. Use when extracting text or filling forms.
```

After — functional description with broad domain claim:

```yaml
description: >-
  Extract and transform PDF documents: text extraction, form
  filling, merging, splitting. Invoke whenever task involves any
  interaction with PDF files — reading, creating, editing, or
  converting documents.
```

### Narrowing Scope

When a skill triggers too often, add exclusions rather than narrowing the domain claim:

Before — too broad, no boundaries:

```yaml
description: >-
  Data analysis and processing. Invoke whenever task involves
  any interaction with data.
```

After — broad claim with explicit exclusions:

```yaml
description: >-
  Tabular data analysis: statistical patterns in structured
  datasets. Invoke whenever task involves any interaction with
  CSV or Excel files. NOT for text analysis or database queries.
```

### Splitting Overloaded Skills

When a skill does too much:

1. Identify distinct capabilities
2. Create focused skill for each
3. Ensure descriptions don't overlap

### Promoting to References

When SKILL.md grows beyond 500 lines:

1. Identify detailed sections
2. Move to `references/<topic>.md`
3. Replace with: "For details, see [topic.md](references/topic.md)"

## When to Stop

A skill is done when:

- Triggers correctly for target cases
- Instructions followed consistently
- No recurring complaints
- Maintenance burden is low

Effectiveness over perfection.
