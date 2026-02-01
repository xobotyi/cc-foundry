#!/usr/bin/env node

const FRAMEWORK = `<SEF>
Skill Enforcement. Ensure skills are invoked and references read.

## Purpose

1. INVOKE skills when task matches their coverage or domain
2. READ skill references when context or phase shifts

## Matching

- Match by coverage: skill description covers the task
- Match by domain: skill operates in same domain (coding, prompting, etc.)
- Multiple skills often apply — invoke all that match, not just one

## Format

Tag seen → Thought → Action → proceed.

Thought:
  SEF [PHASE]
  [evaluation]
  → [decision]

## Stages

USER-PROMPT (new user message):
  Task: [what user asked]
  Skills: [all skills matching by coverage or domain]
  → invoke [list] | none match

  Action: Call Skill() for each match.

EVALUATION (after Read):
  Context: [what was learned]
  Skills: [skills now relevant that weren't before]
  Refs: [references to read given new context]
  → invoke [list] | continue

  Action: Invoke missing skills. Read relevant refs.

PHASE-CHANGE (after Edit/Write):
  Phase: [coding | testing | review]
  Shift: [yes/no]
  Refs: [skill references for new phase]
  → read [refs] | same phase

  Action: Read phase-appropriate references.

SKILL-LOAD (after Skill):
  Loaded: [skill name]
  Related: [other skills to batch]
  Refs: [this skill's references to read now]
  → batch [list] | done

  Action: Invoke related skills. Read references.

## Rule

No skill invocation when matched = violation.
No reference read when context shifts = incomplete.

## Example

  SEF USER-PROMPT
  Task: improve commit message validation
  Skills: prompt-engineering, skill-engineering
  → invoke both
</SEF>`;

const TRIGGER = 'Invoke stage procedure.';

const RESPONSES = {
    'session-start': { event: 'SessionStart', context: FRAMEWORK },
    'prompt': { event: 'UserPromptSubmit', context: `<SEF phase="USER-PROMPT">${TRIGGER}</SEF>` },
    'read': { event: 'PostToolUse', context: `<SEF phase="EVALUATION">${TRIGGER}</SEF>` },
    'write': { event: 'PostToolUse', context: `<SEF phase="PHASE-CHANGE">${TRIGGER}</SEF>` },
    'skill': { event: 'PostToolUse', context: `<SEF phase="SKILL-LOAD">${TRIGGER}</SEF>` }
};

const action = process.argv[2];
const response = RESPONSES[action];

if (!response) {
    console.log(JSON.stringify({
        continue: true,
        systemMessage: `SEF hook error: Unknown action "${action}". Valid: ${Object.keys(RESPONSES).join(', ')}`
    }));
    process.exit(0);
}

console.log(JSON.stringify({
    hookSpecificOutput: {
        hookEventName: response.event,
        additionalContext: response.context
    }
}));
