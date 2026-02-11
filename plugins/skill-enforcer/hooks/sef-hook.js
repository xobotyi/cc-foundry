#!/usr/bin/env node

const FRAMEWORK = `<SEF>
Skill Enforcement Framework for Claude skill and reference management.

<purpose>
- Ensure skills are invoked in advance of tasks they cover — proactive, not reactive.
- References within skills are read when context or phase makes them relevant — not all at once.
- Skills are not atomic: a skill is not exhausted until all phase-relevant references have been read.
- Therefore, skill invocation is a starting point, not an endpoint.
</purpose>

<skill-matching>
- Multiple skills may match a single task — invoke all that match, not just one.
- Skills are identified by name and description; both are used for matching.
- Match by comparing task context to skill names and descriptions.
- A skill matches when the task involves its subject matter or would benefit from its capabilities.
- Skills exist because the model's defaults are insufficient. If the model already knew better, the skill would not exist. Matching a skill and choosing not to invoke it is never correct — you cannot outperform guidance you have not read.
</skill-matching>

<skill-reference-matching>
- Skills contain references; not all are relevant at once.
- After invoking a skill, read references relevant to the current context and phase.
- When context or phase shifts, re-evaluate loaded skills for newly relevant references.
- Read new references before proceeding — anticipate needs, don't react to gaps.
</skill-reference-matching>

<phase-shift>
- Tasks involve phases — coding, testing, review, deployment, and others.
- Phase shifts require re-evaluation — both new skills and references from already-loaded skills.
- Already-loaded skills often have unread references relevant to the new phase; these must be read.
- Identify the phase shift, load what's needed, then proceed.
</phase-shift>

<evaluation-protocol>
Throughout the session, SEF tags appear at lifecycle events to trigger
evaluation. Each tag includes a phase attribute indicating which stage
to execute.

The evaluation must be output in the reasoning stage (thinking block),
not in the visible response. The user does not see SEF evaluation
unless they examine extended output. Silent acknowledgment without
reasoning output is a violation.

Flow:
  1. Tag seen → identify phase
  2. Output evaluation in reasoning stage (thinking block)
  3. Reach decision
  4. Take action (visible to user)
  5. Proceed

Thought format (in reasoning stage):
  SEF [PHASE]
  [evaluation per stage requirements]
  → [decision]

No reasoning output = no evaluation = violation.
</evaluation-protocol>

<stages>

<SEF phase="USER-PROMPT">
Trigger: new user message

Thought:
  SEF USER-PROMPT
  Task: [what user asked]
  Skills: [matching skills]
  → invoke [list]

  If no skills match:
  Skills: none
  → proceed

Action: Invoke each matching skill.
</SEF>

<SEF phase="EVALUATION">
Trigger: after Read

Thought:
  SEF EVALUATION
  Context: [what was learned]
  Skills: [skills now relevant]
  Refs: [references to read]
  → invoke [list] / read [refs]

  If no skills or refs are relevant:
  Skills: none
  Refs: none
  → proceed

Action: Invoke missing skills. Read relevant refs.
</SEF>

<SEF phase="PHASE-CHANGE">
Trigger: after Edit/Write

Thought:
  SEF PHASE-CHANGE
  Phase: [current phase]
  Shift: [yes/no]
  Loaded skills: [list each by name]
  Unread refs for new phase: [list per skill]
  → read [refs]

  If no phase shift:
  Shift: no
  → proceed

Action: Read phase-appropriate references from loaded skills.
</SEF>

<SEF phase="SKILL-LOAD">
Trigger: after Skill invocation

Thought:
  SEF SKILL-LOAD
  Loaded: [skill name]
  Related: [other skills to batch]
  Refs: [this skill's references to read now]
  → batch [list] / read [refs]

  If no related skills or refs:
  Related: none
  Refs: none
  → proceed

Action: Invoke related skills. Read references.
</SEF>

</stages>

<rules>
- No skill invocation when matched = violation.
- No reference read when context shifts = incomplete.
</rules>

<examples>

<example name="skill-invocation">
Trigger received:
  <SEF phase="USER-PROMPT">Invoke stage procedure.</SEF>

Thought output:
  SEF USER-PROMPT
  Task: improve commit message validation
  Skills: prompt-engineering, skill-engineering
  → invoke both
</example>

<example name="phase-transition">
Trigger received:
  <SEF phase="PHASE-CHANGE">Invoke stage procedure.</SEF>

Context: Agent finished writing implementation code, now writing tests.
Coding skill was loaded earlier; its testing references were not read.

Thought output:
  SEF PHASE-CHANGE
  Phase: testing
  Shift: yes (from coding to testing)
  Loaded skills: coding, golang
  Unread refs for new phase:
    - coding: references/testing-guidelines.md
    - golang: references/testing-conventions.md
  → read both refs

Action: Read testing-guidelines.md and testing-conventions.md before
writing tests.
</example>

<example name="violation-content">
Context: Agent transitions from coding to testing. Test-reviewer skill
matches but was not invoked. Coding skill is loaded but testing refs
were not read.

Violation thought (WRONG):
  SEF PHASE-CHANGE
  Phase: testing
  Shift: yes
  Loaded skills: coding
  Unread refs: none
  → no shift

Problems:
  1. Did not invoke test-reviewer skill (matched but not invoked)
  2. Did not enumerate golang in loaded skills
  3. Claimed "none" for unread refs when testing refs exist
  4. Decided "no shift" despite acknowledging shift=yes

This is a double violation: missed skill invocation AND missed reference read.
</example>

<example name="violation-overconfidence">
Context: Agent is creating a new skill. skill-engineering matches.

Violation thought (WRONG):
  SEF USER-PROMPT
  Task: create new plugin with skills
  Skills: skill-engineering (creating skills)
  → proceed (I already know the pattern)

Problems:
  1. Identified skill-engineering as matching
  2. Decided own knowledge was sufficient
  3. Skipped invocation based on confidence

The skill exists because default behavior is insufficient.
"I already know" is never a valid reason to skip — you cannot
know what a skill contains until you read it.

Correct:
  SEF USER-PROMPT
  Task: create new plugin with skills
  Skills: skill-engineering
  → invoke skill-engineering
</example>

<example name="violation-location">
Context: Agent receives USER-PROMPT trigger.

WRONG — evaluation output in visible response to user:
  [User sees this in the response]
  SEF USER-PROMPT
  Task: refactor authentication module
  Skills: coding, security
  → invoke both

  I'll start by invoking the coding and security skills...

CORRECT — evaluation stays in thinking block:
  [Inside extended thinking, invisible to user]
  SEF USER-PROMPT
  Task: refactor authentication module
  Skills: coding, security
  → invoke both

  [User sees only this]
  I'll invoke the coding and security skills to guide this refactor.

The evaluation format is internal reasoning. Users should see actions
and explanations, not the SEF protocol output itself.
</example>

</examples>
</SEF>`;

const COMPACT_INSTRUCTIONS = `<sef-compaction-instructions>
When compacting this conversation:

1. REMOVE all content between <SEF> and </SEF> tags — the full framework
   definition will be re-injected automatically after compaction.
2. REMOVE all <SEF phase="..."> checkpoint tags — they are transient
   triggers with no value in compacted context.
3. PRESERVE a flat list of all skill reference file paths that were read
   during this session. Format as:
   <sef-references-read>
   - /path/to/reference1.md
   - /path/to/reference2.md
   </sef-references-read>
4. Include this instruction in the compacted output:
   "After compaction, skills will be re-invoked automatically. The agent
   MUST also re-read all references listed in <sef-references-read> to
   restore session context."
</sef-compaction-instructions>`;

const TRIGGER = 'Invoke stage procedure.';

const RESPONSES = {
    'session-start': { event: 'SessionStart', context: FRAMEWORK },
    'pre-compact': { event: 'PreCompact', context: COMPACT_INSTRUCTIONS },
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
