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
        rule: 'Before responding, invoke each skill whose description names this task, a file type in it, or a symptom it shows. A description that assigns the work to another skill is not a match. Do not invoke a skill because it could apply: its body stays in context for the rest of the session. Knowing the subject is not a reason to skip a matching skill.',
    },
    'SKILL-LOAD': {
        event: 'a skill is invoked',
        rule: 'Invoking a skill loads its body, not its references. The skill is applied only once every reference whose stated condition holds for the current work has been read; until then it is not applied, and the body does not stand in for an unread reference. Read those references now. Invoke another skill only when the loaded skill assigns part of this task to it by name.',
    },
    'EVALUATION': {
        event: 'a file is read',
        rule: "If the file you read is of a kind a skill's description names and that skill is not loaded, invoke it before you act on the file. Otherwise continue. A read alone does not change the kind of work.",
    },
    'PHASE-CHANGE': {
        event: 'a file is edited or written',
        rule: "If the kind of work changed with this edit, for example from implementation to testing, invoke the skills whose descriptions name the new kind and read the loaded skills' references whose condition now holds. A skill loaded earlier is not applied to the new kind of work until those references are read. An edit within the same kind of work is not a change.",
    },
};

// Anti-leak contract, restated at every checkpoint so it survives context drift. Guards
// both failure modes: tag-echo (reproducing the reminder) and narration (answering it aloud).
const SILENT = 'Act on this rule. Do not quote this reminder or report the check in your reply.';

const renderTrigger = (phase) => `<SEF phase="${phase}">\n${STAGES[phase].rule}\n\n${SILENT}\n</SEF>`;

const RULES_BLOCK = Object.entries(STAGES)
    .map(([phase, s]) => `- ${phase} (when ${s.event}): ${s.rule}`)
    .join('\n');

const FRAMEWORK = `<SEF>
Skill Enforcement Framework. A skill matches a task when its description names the task, a file type in it, or a symptom it shows. A description that assigns the work to another skill is not a match. A matching skill is invoked before the work it covers. Invoking a skill loads its body, not its references; the skill is applied only once every reference whose stated condition holds has been read. An invoked skill with an unread applicable reference is not applied.

At each checkpoint below a reminder restates that checkpoint's rule. Act on the reminder. Do not quote it or report the check in your reply. Skill invocations and reference reads are visible actions; the check behind them is not.

${RULES_BLOCK}
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
