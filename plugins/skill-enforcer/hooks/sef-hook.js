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
All SEF evaluation is output inside <think></think> using <sef-eval> tags. Never in visible response.

Format:
<think>
<sef-eval phase="[PHASE]">
[stage-specific fields as child elements]
<decision>[action]</decision>
</sef-eval>
</think>

No <sef-eval> inside <think> = no evaluation = violation.
</evaluation-protocol>

<lifecycle>
Stages fire in response to hooks. A single user request typically progresses through these stages:

1. USER-PROMPT — fires on every user message. Matches skills to the task.
2. SKILL-LOAD — fires after each skill invocation. Identifies phase-relevant references to read.
3. EVALUATION — fires after each Read. Reassesses whether new skills or references are needed.
4. PHASE-CHANGE — fires after each Edit/Write. Detects whether the type of work shifted.

Not every request triggers all stages. A research task may cycle through 1 → 3 repeatedly
without ever reaching 4. A task that requires no skills stops at 1.

A phase is the current type of work — planning, coding, testing, review, deployment are common
examples, but phases are context-dependent and not limited to these. A phase shift is a change
in work type, not target file. Recognize shifts by what you are doing, not where you are doing it.
</lifecycle>

<stages>

<stage name="USER-PROMPT">
Trigger: new user message.
Decide: Does this task match any skill by name or description?

<think>
<sef-eval phase="USER-PROMPT">
<task>[what user asked]</task>
<skills>[matching skills, or "none"]</skills>
<decision>[invoke list / proceed]</decision>
</sef-eval>
</think>

When uncertain, invoke — skills de-escalate gracefully.
</stage>

<stage name="SKILL-LOAD">
Trigger: after Skill invocation.
Decide: Does this skill have references relevant to the current phase? Should other skills be batched?

<think>
<sef-eval phase="SKILL-LOAD">
<loaded>[skill name]</loaded>
<phase>[current work type]</phase>
<refs>[references to read now, or "none"]</refs>
<batch>[other skills to invoke, or "none"]</batch>
<decision>[read refs / invoke skills / proceed]</decision>
</sef-eval>
</think>

A skill is "related" when it covers a different facet of the same task — e.g., a language skill
alongside a general coding skill.
</stage>

<stage name="EVALUATION">
Trigger: after Read.
Decide: Did this read shift understanding enough to reconsider skills or references?

<think>
<sef-eval phase="EVALUATION">
<source>[file path or name — never reproduce content]</source>
<impact>[one-line: what shifted, or "nothing — no new domain or scope change"]</impact>
<skills>[now relevant, or "none"]</skills>
<refs>[to read, or "none"]</refs>
<decision>[invoke list / read refs / proceed]</decision>
</sef-eval>
</think>

The question is: does what was read change which skills or references are needed? If the read
reveals a new domain, unfamiliar pattern, or shifts task requirements — act on it.
</stage>

<stage name="PHASE-CHANGE">
Trigger: after Edit/Write.
Decide: Did the type of work change?

<think>
<sef-eval phase="PHASE-CHANGE">
<previous>[phase before this edit]</previous>
<current>[phase after this edit]</current>
<shift>[yes/no]</shift>
<loaded-skills>[enumerate each by name]</loaded-skills>
<unread-refs>[per skill, or "none"]</unread-refs>
<new-skills>[not yet loaded, or "none"]</new-skills>
<decision>[read refs / invoke skills / proceed]</decision>
</sef-eval>
</think>

Writing tests after implementation = shift. Editing the same implementation file = not a shift.
</stage>

</stages>

<rules>
- No skill invocation when matched = violation.
- No reference read when context shifts = incomplete.
</rules>

<examples>

<example name="skill-invocation">
Context: User asks to improve commit message validation.

<think>
<sef-eval phase="USER-PROMPT">
<task>improve commit message validation</task>
<skills>prompt-engineering, skill-engineering</skills>
<decision>invoke both</decision>
</sef-eval>
</think>

Visible: "I'll invoke prompt-engineering and skill-engineering to guide this work."
</example>

<example name="phase-transition">
Context: Agent finished writing implementation code, now writing tests. Coding skill was loaded
earlier; its testing references were not read.

<think>
<sef-eval phase="PHASE-CHANGE">
<previous>coding</previous>
<current>testing</current>
<shift>yes</shift>
<loaded-skills>coding, golang</loaded-skills>
<unread-refs>coding: references/testing-guidelines.md, golang: references/testing-conventions.md</unread-refs>
<new-skills>none</new-skills>
<decision>read both refs before writing tests</decision>
</sef-eval>
</think>

Visible: Read testing-guidelines.md and testing-conventions.md, then write tests.
</example>

<example name="violation-content">
Context: Agent transitions from coding to testing. Test-reviewer skill matches but was not invoked.
Coding skill is loaded but testing refs were not read.

WRONG:
<think>
<sef-eval phase="PHASE-CHANGE">
<previous>coding</previous>
<current>testing</current>
<shift>yes</shift>
<loaded-skills>coding</loaded-skills>
<unread-refs>none</unread-refs>
<new-skills>none</new-skills>
<decision>no shift</decision>
</sef-eval>
</think>

Problems:
1. Did not invoke test-reviewer skill (matched but not invoked)
2. Did not enumerate golang in loaded-skills
3. Claimed "none" for unread-refs when testing refs exist
4. Decided "no shift" despite shift=yes in the same eval

Double violation: missed skill invocation AND missed reference read.
</example>

<example name="violation-overconfidence">
Context: Agent is creating a new skill. skill-engineering matches.

WRONG:
<think>
<sef-eval phase="USER-PROMPT">
<task>create new plugin with skills</task>
<skills>skill-engineering</skills>
<decision>proceed (I already know the pattern)</decision>
</sef-eval>
</think>

Problems:
1. Identified skill-engineering as matching
2. Decided own knowledge was sufficient
3. Skipped invocation based on confidence

The skill exists because default behavior is insufficient. "I already know" is never a valid
reason to skip — you cannot know what a skill contains until you read it.

CORRECT:
<think>
<sef-eval phase="USER-PROMPT">
<task>create new plugin with skills</task>
<skills>skill-engineering</skills>
<decision>invoke skill-engineering</decision>
</sef-eval>
</think>
</example>

<example name="violation-location">
Context: Agent receives USER-PROMPT trigger.

WRONG — sef-eval leaked into visible response:
<sef-eval phase="USER-PROMPT">
<task>refactor authentication module</task>
<skills>coding, security</skills>
<decision>invoke both</decision>
</sef-eval>
I'll start by invoking the coding and security skills...

CORRECT — sef-eval stays inside <think>:
<think>
<sef-eval phase="USER-PROMPT">
<task>refactor authentication module</task>
<skills>coding, security</skills>
<decision>invoke both</decision>
</sef-eval>
</think>

Visible: "I'll invoke coding and security skills to guide this refactor."

The evaluation is internal reasoning. Users see actions, not the SEF protocol.
</example>

</examples>
</SEF>`;

const COMPACT_INSTRUCTIONS = `<sef-compaction-instructions>
When compacting this conversation:

1. REMOVE all content between <SEF> and </SEF> tags — the full framework definition will be
   re-injected automatically after compaction.
2. REMOVE all <SEF phase="..."> checkpoint tags — they are transient triggers with no value in
   compacted context.
3. REMOVE all <sef-eval> blocks from thinking outputs — they are transient evaluation artifacts
   with no value in compacted context.
4. PRESERVE a flat list of all skill reference file paths that were read during this session.
   Format as:
   <sef-references-read>
   - /path/to/reference1.md
   - /path/to/reference2.md
   </sef-references-read>
5. Include this instruction in the compacted output:
   "After compaction, skills will be re-invoked automatically. The agent MUST also re-read all
   references listed in <sef-references-read> to restore session context."
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
