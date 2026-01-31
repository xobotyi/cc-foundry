# Iterating on Subagents

Guide to improving existing subagents based on observed behavior.

---

## Table of Contents
- [Improvement Workflow](#improvement-workflow)
- [Common Issues and Fixes](#common-issues-and-fixes)
- [Prompt Refinement Techniques](#prompt-refinement-techniques)
- [Version Control for Agents](#version-control-for-agents)
- [A/B Testing Agents](#ab-testing-agents)
- [Incremental Improvement](#incremental-improvement)
- [When to Redesign vs. Iterate](#when-to-redesign-vs-iterate)
- [Feedback Loop](#feedback-loop)

---

## Improvement Workflow

```
1. Identify Issue → What's not working?
2. Diagnose Cause → Why is it happening?
3. Plan Fix → What change will help?
4. Implement → Make the change
5. Test → Verify improvement
6. Monitor → Watch for regressions
```

## Common Issues and Fixes

### Issue: Agent Doesn't Trigger

**Symptoms:**
- Claude ignores the agent even for matching tasks
- Have to explicitly say "use the X agent"

**Diagnosis:**
- Description too narrow?
- Name has typo?
- Agent not loaded (manual file creation)?

**Fixes:**

```yaml
# Before: too specific
description: "Reviews Python code for PEP8 compliance"

# After: broader trigger
description: "Code review specialist for quality, style, and best practices.
  Use proactively after writing or modifying code."
```

Add "use proactively" to encourage automatic delegation:
```yaml
description: "Debugger. Use proactively when encountering errors."
```

### Issue: Agent Over-Triggers

**Symptoms:**
- Delegates to agent for unrelated tasks
- Takes over when main conversation would be better

**Diagnosis:**
- Description too vague?
- Overlaps with other agents?

**Fixes:**

```yaml
# Before: too broad
description: "Helps with code"

# After: specific scope
description: "Security vulnerability scanner for authentication and
  authorization code. Use when reviewing auth modules or after
  security-related changes."
```

Add explicit boundaries:
```markdown
---
name: security-reviewer
description: "Security review for auth code only. NOT for general code review."
---
```

### Issue: Wrong Output Format

**Symptoms:**
- Output doesn't match expected structure
- Inconsistent formatting across runs

**Diagnosis:**
- Format not specified clearly?
- No examples in prompt?

**Fixes:**

Add explicit format specification:
```markdown
## Output Format
Provide your findings as:

### Critical Issues
- [Issue]: [Location] - [Fix]

### Warnings
- [Issue]: [Location] - [Fix]

### Suggestions
- [Suggestion]: [Location]
```

Add an example:
```markdown
## Example Output

### Critical Issues
- SQL Injection: auth.py:42 - Use parameterized queries

### Warnings
- Missing validation: user.py:15 - Add input sanitization

### Suggestions
- Consider adding rate limiting to login endpoint
```

### Issue: Incomplete Task Execution

**Symptoms:**
- Stops before finishing
- Misses important steps
- Partial analysis

**Diagnosis:**
- Workflow not explicit enough?
- Missing checklist?
- Scope too large?

**Fixes:**

Add numbered steps:
```markdown
When invoked, follow these steps IN ORDER:
1. Run git diff to identify changed files
2. Read each changed file completely
3. Analyze for issues using the checklist below
4. Compile findings by priority
5. Return formatted report
```

Add completion checklist:
```markdown
Before returning, verify:
- [ ] All changed files reviewed
- [ ] Each checklist item addressed
- [ ] Findings organized by priority
- [ ] Specific fixes provided
```

### Issue: Scope Creep

**Symptoms:**
- Agent does more than asked
- Modifies files when should only read
- Makes decisions it shouldn't

**Diagnosis:**
- Tools too permissive?
- Prompt doesn't set boundaries?

**Fixes:**

Restrict tools:
```yaml
# Before: full access
tools: Read, Write, Edit, Bash, Glob, Grep

# After: read-only
tools: Read, Glob, Grep
```

Add explicit constraints:
```markdown
## Constraints
- DO NOT modify any files
- DO NOT make implementation decisions
- ONLY report findings, do not fix them
- ASK for clarification if requirements are unclear
```

### Issue: Poor Context Efficiency

**Symptoms:**
- Reads too many files
- Returns verbose output
- Slow execution

**Diagnosis:**
- No efficiency guidance?
- Returns raw data instead of synthesis?

**Fixes:**

Add efficiency instructions:
```markdown
## Efficiency Guidelines
- Use Grep to locate relevant code before reading entire files
- Stop searching once you have enough information
- Synthesize findings into actionable summary
- Do NOT return raw search results
```

Specify return format:
```markdown
## Return to Parent
Return a concise summary (max 500 words) containing:
- Key findings (bullet points)
- Recommended actions
- Files examined (list only, not contents)
```

## Prompt Refinement Techniques

### Adding Examples

Examples clarify expectations:

```markdown
## Examples

### Input
"Review the authentication module"

### Expected Behavior
1. Locate auth-related files
2. Check for common vulnerabilities
3. Return prioritized findings

### Example Output
**Critical:** Password stored in plaintext (auth/user.py:23)
**Warning:** No rate limiting on login endpoint
**Suggestion:** Consider adding 2FA support
```

### Using Checklists

Checklists ensure consistency:

```markdown
## Review Checklist

### Security
- [ ] No hardcoded credentials
- [ ] Input validation present
- [ ] SQL injection protected
- [ ] XSS prevented

### Quality
- [ ] Clear naming
- [ ] No code duplication
- [ ] Error handling present
- [ ] Tests exist
```

### Conditional Instructions

Handle different scenarios:

```markdown
## Workflow

IF reviewing new code:
1. Focus on design and patterns
2. Check for test coverage
3. Verify documentation

IF reviewing bug fix:
1. Verify the fix addresses root cause
2. Check for regression risks
3. Ensure tests cover the fix

IF reviewing refactor:
1. Verify behavior unchanged
2. Check for improvements
3. Validate test coverage maintained
```

## Version Control for Agents

Keep track of changes:

```markdown
---
name: code-reviewer
description: "..."
# version: 2.1
# changelog:
#   2.1 - Added security checklist
#   2.0 - Restructured output format
#   1.0 - Initial version
---
```

Or maintain separate files:
```
.claude/agents/
├── code-reviewer.md          # Current version
├── code-reviewer-v1.md       # Previous version (backup)
└── code-reviewer-experimental.md  # Testing new approach
```

## A/B Testing Agents

Test changes before committing:

1. Create variant with different name:
```markdown
---
name: code-reviewer-v2
description: "Code reviewer (experimental v2). Use for testing new format."
---
```

2. Run same tasks with both versions
3. Compare results
4. Keep winner, archive loser

## Incremental Improvement

Don't change everything at once:

```
Week 1: Fix trigger accuracy
Week 2: Improve output format
Week 3: Add efficiency guidelines
Week 4: Refine checklists
```

Test after each change to isolate impact.

## When to Redesign vs. Iterate

**Iterate when:**
- Core concept is sound
- Issues are specific and fixable
- Changes are incremental

**Redesign when:**
- Fundamental approach is wrong
- Multiple major issues
- Requirements have changed significantly
- Agent tries to do too much (split it)

## Feedback Loop

Establish continuous improvement:

```
Use agent → Observe issues → Document → Fix → Test → Repeat
```

Keep a log of issues and fixes:

```markdown
## Agent: code-reviewer

### Issue Log
| Date | Issue | Fix | Result |
|------|-------|-----|--------|
| 2024-01-15 | Over-triggers | Narrowed description | Fixed |
| 2024-01-20 | Missing security checks | Added checklist | Fixed |
| 2024-01-25 | Verbose output | Added synthesis step | Improved |
```
