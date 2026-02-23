# Troubleshooting Subagents

Diagnose and fix common subagent problems.

---

## Table of Contents
- [Quick Diagnosis](#quick-diagnosis)
- [Detailed Troubleshooting](#detailed-troubleshooting)
- [Error Messages](#error-messages)
- [Debug Mode](#debug-mode)
- [Getting Help](#getting-help)

---

## Quick Diagnosis

| Symptom | Likely Cause | Solution |
|---------|--------------|----------|
| Agent never triggers | Name typo, vague description | Check spec, broaden description |
| Agent triggers too often | Description too broad | Narrow scope, add boundaries |
| Wrong output format | No format spec in prompt | Add explicit format + example |
| Stops mid-task | Unclear workflow, no checklist | Add numbered steps, completion criteria |
| Scope creep | Too many tools, no constraints | Restrict tools, add boundaries |
| Permission errors | Wrong tools granted | Check `tools` field, add needed tools |
| Hook not firing | Wrong event/matcher | Check hooks configuration |
| Agent not loaded | Manual file not reloaded | Restart session or use `/agents` |

## Detailed Troubleshooting

### Agent Not Found / Never Triggers

**Symptoms:**
- Claude says it doesn't know about the agent
- Have to explicitly invoke by name every time
- Agent doesn't appear in `/agents` list

**Diagnostic steps:**

1. **Check file location:**
```bash
# Project-level
ls -la .claude/agents/

# User-level
ls -la ~/.claude/agents/
```

2. **Check file extension:**
Must be `.md` (not `.txt`, `.yaml`, etc.)

3. **Check frontmatter syntax:**
```markdown
---
name: my-agent        # Required
description: "..."    # Required
---
```

Common YAML errors:
- Missing `---` delimiters
- Incorrect indentation
- Unquoted special characters

4. **Check name format:**
```yaml
# Valid
name: code-reviewer
name: my-agent-v2

# Invalid
name: Code_Reviewer    # uppercase, underscore
name: my agent         # space
name: <agent>          # special chars
```

5. **Reload the agent:**
- Restart Claude Code session, OR
- Run `/agents` to force reload

### Agent Triggers Incorrectly

**Over-triggering (false positives):**

The agent activates for unrelated tasks.

**Fix:** Narrow the description:
```yaml
# Before
description: "Helps with code"

# After
description: "Security audit for authentication modules only.
  Use when reviewing auth code or after security-related changes."
```

**Under-triggering (false negatives):**

The agent doesn't activate for matching tasks.

**Fix:** Broaden the description and add trigger phrases:
```yaml
# Before
description: "Reviews Python PEP8 compliance"

# After
description: "Code review specialist for style, quality, and best practices.
  Use proactively after writing or modifying code in any language."
```

### Tools Not Working

**Symptoms:**
- "Tool not available" errors
- Agent can't perform expected actions
- Unexpected permission prompts

**Diagnostic steps:**

1. **Check `tools` field:**
```yaml
# Explicit tools list
tools: Read, Grep, Glob

# Or omit to inherit all
# (no tools field = inherit from parent)
```

2. **Check tool names are exact:**
```yaml
# Correct
tools: Read, Write, Edit, Bash, Glob, Grep

# Wrong
tools: read, write  # lowercase
tools: ReadFile     # wrong name
```

3. **Check `disallowedTools` conflict:**
```yaml
# Conflicting configuration
tools: Read, Write
disallowedTools: Write  # Write is both allowed and disallowed
```

4. **Check permission mode:**
```yaml
# May block tools
permissionMode: dontAsk  # auto-denies permission prompts
```

### Output Format Problems

**Symptoms:**
- Inconsistent formatting
- Missing expected sections
- Wrong structure

**Fix 1: Add explicit format specification:**
```markdown
## Output Format

Your response MUST follow this exact structure:

### Summary
[1-2 sentence overview]

### Findings
- **Critical:** [issue] at [location]
- **Warning:** [issue] at [location]

### Recommendations
1. [First action]
2. [Second action]
```

**Fix 2: Add an example:**
```markdown
## Example Output

### Summary
Found 2 security issues in the auth module.

### Findings
- **Critical:** SQL injection in login() at auth.py:42
- **Warning:** Missing rate limiting at auth.py:15

### Recommendations
1. Use parameterized queries for all database calls
2. Add rate limiting to prevent brute force attacks
```

**Fix 3: Use prefill-like guidance:**
```markdown
Begin your response with "## Summary" and follow the format exactly.
```

### Task Incomplete

**Symptoms:**
- Agent stops before finishing
- Missing steps in workflow
- Partial analysis

**Fix 1: Add numbered steps:**
```markdown
Execute these steps IN ORDER:

1. List all files matching the pattern
2. Read each file completely
3. Analyze using the checklist below
4. Compile findings
5. Return formatted report

Do not skip any steps.
```

**Fix 2: Add completion checklist:**
```markdown
Before returning your response, verify:
- [ ] All matching files examined
- [ ] Each checklist item addressed
- [ ] Findings organized by priority
- [ ] Specific recommendations provided

If any item is incomplete, continue working.
```

**Fix 3: Set explicit completion criteria:**
```markdown
Your task is COMPLETE when:
- All changed files have been reviewed
- Security checklist is fully addressed
- Output follows the specified format

Do not return until all criteria are met.
```

### Hooks Not Firing

**Symptoms:**
- Hook commands don't execute
- No stdout from hook scripts
- Expected validation not happening

**Diagnostic steps:**

1. **Check hook configuration in frontmatter:**
```yaml
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate.sh"
```

2. **Check matcher pattern:**
```yaml
# Exact match
matcher: "Bash"

# Regex match
matcher: "Edit|Write"
```

3. **Check script is executable:**
```bash
chmod +x ./scripts/validate.sh
```

4. **Check script path:**
Paths are relative to working directory.

5. **Check hook event:**
| Event | When |
|-------|------|
| `PreToolUse` | Before tool execution |
| `PostToolUse` | After tool execution |
| `Stop` | When agent finishes |

6. **Test script manually:**
```bash
./scripts/validate.sh
echo $?  # Check exit code
```

### Context/Memory Issues

**Symptoms:**
- Agent forgets earlier context
- Repeated searches for same information
- "I don't have access to..." for info it should have

**Causes and fixes:**

- **Auto-compaction:** Context may have been summarized.
  - Set `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` lower
  - Use more concise prompts

- **Subagent isolation:** Subagents have own context, don't inherit conversation.
  - Pass necessary context in the prompt/task description
  - Use `skills` field to preload required knowledge

- **Fresh start:** Each subagent invocation starts fresh (unless resumed).
  - Use resume feature: `resume: agent-id`
  - Or pass context explicitly

### Performance Issues

**Symptoms:**
- Agent is very slow
- Excessive tool calls
- Reading too many files

**Fix 1: Add efficiency instructions:**
```markdown
## Efficiency

- Use Grep to locate relevant code BEFORE reading entire files
- Stop searching once you have sufficient information
- Prefer targeted searches over broad scans
- Maximum 10 files per analysis unless explicitly needed
```

**Fix 2: Restrict model:**
```yaml
# For simple tasks
model: haiku  # Faster, cheaper
```

**Fix 3: Narrow tool scope:**
```yaml
# Remove unnecessary tools
tools: Read, Grep  # Not Bash if not needed
```

## Error Messages

### "Agent not found"

```
Agent 'xxx' not found
```

- Check file exists in correct location
- Check name matches filename (minus .md)
- Restart session to reload

### "Tool not available"

```
Tool 'Write' is not available to this agent
```

- Add tool to `tools` field
- Remove from `disallowedTools` if present
- Check parent permissions

### "Permission denied"

```
Permission denied for operation
```

- Check `permissionMode` setting
- Verify user has granted permission
- Consider `acceptEdits` or `bypassPermissions` if appropriate

### "Maximum turns exceeded"

```
Agent reached maximum turns without completing
```

- Task may be too complex for single agent
- Add clearer completion criteria
- Split into multiple agents

## Debug Mode

Enable verbose logging:

```bash
CLAUDE_CODE_DEBUG=1 claude
```

Or trace LLM traffic (advanced):
- Set up proxy to inspect requests
- Check actual prompts being sent

## Getting Help

If still stuck:

- Check `/agents` output for agent status
- Review Claude Code docs: https://docs.anthropic.com/en/docs/claude-code/sub-agents
- Report issues: https://github.com/anthropics/claude-code/issues
