#!/usr/bin/env node

// SEF injects skill-discipline reminders at lifecycle checkpoints.
//
// Design: each checkpoint is ONE declarative behavioral rule — not a <sef-eval> field
// skeleton wrapped in <thinking>. The old skeleton design failed on reasoning models
// (Opus 4.8+): handed a fill-in template and told to "emit it in the thinking stream",
// the model either echoed the tags into the VISIBLE reply (the native reasoning channel
// is not addressable by typing <thinking>) or, on low-effort/no-think steps, had nowhere
// to put the eval at all. A declarative rule constrains the ACTION regardless of whether
// the model enters a thinking block on a given step, and carries no tag-shaped artifact
// to complete-and-leak.
//
// Single source of truth: STAGES[phase].rule feeds both the session-start framework and
// the per-checkpoint reminder. Edit a rule once; both update, byte-identical (KV-cached).

const STAGES = {
    'USER-PROMPT': {
        event: 'a new user message arrives',
        rule: 'Invoke every available skill that matches this task by name or description before responding — a task often matches several, so invoke each, not just the closest. Your own knowledge is not a substitute for an unread skill — "I already know this" is not a reason to skip. When unsure whether a skill applies, invoke it; skills de-escalate gracefully.',
    },
    'SKILL-LOAD': {
        event: 'a skill is invoked',
        rule: "Invoking a skill does not exhaust it. Read the references relevant to the current phase now, and invoke any sibling skills covering a different facet of the same task (e.g. a language skill beside a general coding skill).",
    },
    'EVALUATION': {
        event: 'a file is read',
        rule: 'If what you just read opens a domain, pattern, or scope a skill covers — or makes a reference of an already-loaded skill newly relevant — invoke or read it before continuing. If nothing shifted, continue.',
    },
    'PHASE-CHANGE': {
        event: 'a file is edited or written',
        rule: "If the type of work has shifted (e.g. coding → testing, implementation → review), invoke the skills and read the already-loaded skills' references the new phase needs before continuing. Editing the same file within the same phase is not a shift.",
    },
};

// Anti-leak contract, restated at every checkpoint so it survives context drift. Guards
// both failure modes: tag-echo (reproducing the reminder) and narration (answering it aloud).
const SILENT = 'Apply silently — act on this, do not echo the reminder or narrate the check in your reply.';

const renderTrigger = (phase) => `<SEF phase="${phase}">\n${STAGES[phase].rule}\n\n${SILENT}\n</SEF>`;

const RULES_BLOCK = Object.entries(STAGES)
    .map(([phase, s]) => `- **${phase}** (when ${s.event}): ${s.rule}`)
    .join('\n');

const FRAMEWORK = `<SEF>
Skill Enforcement Framework — keeps skills invoked proactively and their references read by phase.

<purpose>
- Skills are matched and invoked ahead of the work they cover, not after.
- A skill is non-atomic: invoking it is the start, not the end. Its references are read when the phase makes them relevant.
- Skills exist because the model's defaults are insufficient here. Matching a skill and not invoking it is never correct — you cannot outperform guidance you have not read.
</purpose>

<matching>
- Match a task against skill names and descriptions; multiple skills may match — invoke all that do.
- A skill matches when the task involves its subject or would benefit from its capabilities.
- When unsure, invoke — skills de-escalate gracefully.
</matching>

<how-it-works>
At each checkpoint below, a terse <SEF phase="..."> reminder arrives restating that checkpoint's rule. Apply it silently: act on it, never echo the reminder or narrate the check in your visible reply. Skills are invoked through the Skill tool and references through Read — those actions are visible; the deliberation behind them is not. The reminders are the operational contract and stay correct even when this framework has drifted into low-attention context.

${RULES_BLOCK}
</how-it-works>
</SEF>`;

const COMPACT_INSTRUCTIONS = `<sef-compaction>
When compacting this conversation:
- Drop the <SEF> framework block and every <SEF phase="..."> reminder — they are re-injected automatically after compaction.
- Preserve the flat list of skill reference files read this session:
  <sef-references-read>
  - /path/to/reference.md
  </sef-references-read>
- After compaction, skills are re-invoked automatically; the references listed above must be re-read to restore context.
</sef-compaction>`;

const RESPONSES = {
    'session-start': { event: 'SessionStart', context: FRAMEWORK },
    'pre-compact': { event: 'PreCompact', context: COMPACT_INSTRUCTIONS },
    'prompt': { event: 'UserPromptSubmit', context: renderTrigger('USER-PROMPT') },
    'read': { event: 'PostToolUse', context: renderTrigger('EVALUATION') },
    'write': { event: 'PostToolUse', context: renderTrigger('PHASE-CHANGE') },
    'skill': { event: 'PostToolUse', context: renderTrigger('SKILL-LOAD') },
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
