# Advanced Skill Patterns

## Multi-File Skills

### When to Split

Split into multiple files when:
- SKILL.md exceeds 500 lines
- Content applies only to specific scenarios
- Detailed reference material needed occasionally
- Multiple distinct domains within one skill

### Structure Pattern

```
complex-skill/
├── SKILL.md                 # Overview + navigation
├── references/
│   ├── domain-a.md          # Domain A details
│   ├── domain-b.md          # Domain B details
│   └── api-reference.md     # Full API docs
├── scripts/
│   └── validator.py         # Validation script
└── assets/
    └── template.json        # Output template
```

### Navigation in SKILL.md

```markdown
# Complex Skill

## Quick Start
[Minimal guidance to get going]

## Detailed Guides

**For Domain A tasks:** See [domain-a.md](references/domain-a.md)
**For Domain B tasks:** See [domain-b.md](references/domain-b.md)
**API reference:** See [api-reference.md](references/api-reference.md)
```

Claude reads referenced files only when needed.

## Skills with Scripts

### When to Use Scripts

- Deterministic operations (no LLM judgment needed)
- Complex transformations
- Validation logic
- Data parsing
- File format manipulation

### Script Design Principles

**Handle errors explicitly:**
```python
def process_file(path):
    try:
        with open(path) as f:
            return f.read()
    except FileNotFoundError:
        # Create default instead of failing
        print(f"File {path} not found, creating default")
        with open(path, 'w') as f:
            f.write('{}')
        return '{}'
```

**Don't punt to Claude:**
```python
# Bad: Raises exception for Claude to handle
def validate(data):
    if not data:
        raise ValueError("Invalid data")

# Good: Returns actionable information
def validate(data):
    if not data:
        return {"valid": False, "error": "Data is empty",
                "suggestion": "Provide input data"}
```

**Document constants:**
```python
# Bad: Magic numbers
TIMEOUT = 47
RETRIES = 5

# Good: Explained
TIMEOUT = 30  # HTTP requests typically complete within 30 seconds
RETRIES = 3   # Most intermittent failures resolve by second retry
```

### Referencing Scripts

```markdown
## Validation

Run validation before processing:
\`\`\`bash
python scripts/validate.py input.json
\`\`\`

Expected output:
- "OK" if valid
- Error details with line numbers if invalid
```

## Workflow Skills

### Sequential Workflow Pattern

```markdown
## Workflow

Copy this checklist and track progress:

\`\`\`
Progress:
- [ ] Step 1: Analyze input
- [ ] Step 2: Generate plan
- [ ] Step 3: Execute plan
- [ ] Step 4: Verify results
\`\`\`

### Step 1: Analyze Input
[Instructions]

### Step 2: Generate Plan
Wait for user approval before proceeding.

### Step 3: Execute Plan
[Instructions]

### Step 4: Verify Results
[Verification criteria]
```

### Conditional Workflow Pattern

```markdown
## Workflow

### Determine Task Type

**Creating new?** → Follow [Creation Workflow](#creation-workflow)
**Modifying existing?** → Follow [Modification Workflow](#modification-workflow)

### Creation Workflow
1. [Create steps]

### Modification Workflow
1. [Modify steps]
```

### Feedback Loop Pattern

```markdown
## Iterative Refinement

1. Generate initial output
2. Run validation: \`python scripts/validate.py output.json\`
3. If validation fails:
   - Review error messages
   - Fix identified issues
   - Re-run validation
4. Only proceed when validation passes
5. Present results to user
```

## Context Injection

### Dynamic Context with Shell Commands

Use `!`command\`\` to inject shell output:

```markdown
## Current Context

- Git status: !`git status --short`
- Current branch: !`git branch --show-current`
- Recent commits: !`git log --oneline -5`
```

The commands execute before Claude sees the skill, replacing placeholders
with actual output.

### Session Variables

```markdown
Log activity to: logs/${CLAUDE_SESSION_ID}.log

Arguments provided: $ARGUMENTS
First argument: $0
Second argument: $1
```

## Subagent Integration

### Fork Pattern

Run skill in isolated context:

```yaml
---
name: deep-research
description: Research a topic thoroughly using isolated context
context: fork
agent: Explore
---

# Research Task

Research $ARGUMENTS thoroughly:

1. Find relevant files using Glob and Grep
2. Read and analyze the code
3. Summarize findings with specific file references
```

### Available Agents

| Agent | Best For |
|-------|----------|
| `Explore` | Read-only exploration, research |
| `Plan` | Architecture design, implementation planning |
| `general-purpose` | Complex multi-step tasks |
| Custom | Define in `.claude/agents/` |

### When to Fork

Fork when:
- Task is computationally heavy
- Need isolated context (won't pollute main conversation)
- Want specific model for the task
- Task is self-contained with clear output

Don't fork when:
- Need access to conversation history
- Task builds on recent context
- Simple task that doesn't need isolation

## Composable Skills

### Skills That Reference Other Skills

```markdown
# Code Review Skill

## Process

1. First, invoke the `code-style` skill to check formatting
2. Then check for these additional issues:
   - Security vulnerabilities
   - Performance concerns
   - Test coverage
```

### Skills With Shared References

```
shared-knowledge/
├── company-conventions.md
└── glossary.md

skill-a/
├── SKILL.md (references ../shared-knowledge/conventions.md)

skill-b/
├── SKILL.md (references ../shared-knowledge/conventions.md)
```

## Permission Scoping

### allowed-tools Field

```yaml
---
name: safe-reader
description: Read-only file exploration
allowed-tools: Read Grep Glob
---
```

Claude can only use listed tools without prompting.

### Tool Patterns

```yaml
# Specific git commands only
allowed-tools: Bash(git status:*) Bash(git diff:*) Bash(git log:*) Read

# File operations only
allowed-tools: Read Write Edit Glob Grep

# Specific script only
allowed-tools: Bash(python scripts/validator.py:*) Read
```

## Template Skills

### Template with Placeholders

```markdown
## Output Template

Use this template for all reports:

\`\`\`markdown
# {{TITLE}}

## Summary
{{EXECUTIVE_SUMMARY}}

## Key Findings
{{FINDINGS_LIST}}

## Recommendations
{{RECOMMENDATIONS}}

## Appendix
{{DETAILED_DATA}}
\`\`\`

Fill placeholders based on analysis.
```

### Template from Assets

```markdown
## Report Generation

1. Read template from assets/report-template.html
2. Fill placeholders with analyzed data:
   - {{title}} → Report title
   - {{date}} → Current date
   - {{content}} → Analysis results
3. Save to output directory
```

## Visual Output Skills

### HTML Generation Pattern

```markdown
## Visualization

Generate interactive HTML for exploration:

\`\`\`bash
python scripts/visualize.py --input data.json --output report.html
\`\`\`

The script generates a self-contained HTML file with:
- Interactive charts
- Collapsible sections
- Search/filter capability

Open in browser to explore results.
```

### When to Generate Visual Output

- Data exploration with many dimensions
- Results that benefit from interactivity
- Outputs for non-technical stakeholders
- Complex relationships that need visualization

## Security Considerations

### Input Validation in Skills

```markdown
## Input Requirements

Before processing, verify:
- File exists and is readable
- File size is under 10MB
- File extension matches expected type
- Content does not contain executable code
```

### Limiting Scope

```markdown
## Scope Boundaries

This skill operates ONLY on:
- Files in the current project directory
- Files with extensions: .py, .js, .ts

Do NOT:
- Access files outside project directory
- Modify system files
- Execute downloaded code
- Make network requests
```

### Audit Trail

```markdown
## Logging

Log all operations to logs/${CLAUDE_SESSION_ID}.log:
- Timestamp
- Operation performed
- Files affected
- Result status
```
