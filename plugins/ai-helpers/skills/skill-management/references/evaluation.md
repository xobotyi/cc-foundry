# Evaluating Skills

## Quick Assessment

Read the skill and answer:

1. **Is the description specific?** Does it clearly state what the skill
   does AND when to use it?
2. **Would Claude trigger this correctly?** Given typical user requests,
   would this skill activate at the right times?
3. **Is it concise?** Could any content be removed without losing value?
4. **Are instructions actionable?** Can Claude follow them without ambiguity?

## Evaluation Checklist

### Metadata Quality

- [ ] `name` follows spec (lowercase, hyphens, ≤64 chars)
- [ ] `description` is specific, not vague
- [ ] `description` includes triggers/contexts for when to use
- [ ] `description` ≤1024 characters
- [ ] `description` contains NO bloat (no "Keywords:", "Done when:")

### Content Quality

- [ ] SKILL.md body ≤500 lines
- [ ] No verbose explanations of things Claude already knows
- [ ] Examples are concrete, not abstract
- [ ] Instructions use imperative form
- [ ] Terminology is consistent throughout

### Structure Quality

- [ ] References are one level deep (no nested references)
- [ ] Long reference files have table of contents
- [ ] Progressive disclosure used appropriately
- [ ] No duplicate information between SKILL.md and references

### Workflow Quality (if applicable)

- [ ] Steps are clear and sequential
- [ ] Decision points are explicit
- [ ] Validation/feedback loops included for critical operations
- [ ] Error handling guidance provided

## Quality Signals

### Strong Skill Indicators

- Description reads like a feature announcement: "Does X when Y"
- SKILL.md fits on ~2 screens
- Examples show realistic user requests
- References are domain-specific (schemas, policies) not generic

### Weak Skill Indicators

- Description is vague: "Helps with documents"
- Description is bloated: "Keywords:", "Done when:", execution details
- Walls of explanatory text
- Duplicates information Claude already has

## Evaluation by Purpose

### For Workflow Skills

Ask:
- Are steps in logical order?
- Are dependencies between steps clear?
- What happens if a step fails?
- Is there unnecessary flexibility where precision is needed?

### For Reference Skills

Ask:
- Is the information something Claude doesn't already know?
- Is it organized for quick lookup?
- Are there search patterns for large files?

### For Tool Integration Skills

Ask:
- Are tool invocations precise?
- Are error cases handled?
- Is output format specified?

## Comparative Evaluation

When multiple skills exist for similar purposes:

1. **Check for overlap** — Do descriptions compete for the same triggers?
2. **Check for gaps** — Are there use cases neither skill covers?
3. **Consider merging** — Would one broader skill be clearer than two?
4. **Consider splitting** — Is one skill trying to do too many things?

## Testing Approach

### Mental Simulation

For each example use case:
1. Would the description trigger this skill?
2. Walk through the instructions — are they sufficient?
3. What could go wrong?

### Real Usage Testing

1. Use the skill on actual tasks
2. Note where Claude struggles or deviates
3. Identify missing context or unclear instructions
4. Check if the right references get loaded

### Cross-Model Testing

If the skill will be used with multiple models:
- **Haiku**: Does it provide enough guidance?
- **Sonnet**: Is it clear and efficient?
- **Opus**: Does it avoid over-explaining?
