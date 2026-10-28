#!/usr/bin/env node

type Phase = 'USER-PROMPT' | 'SKILL-LOAD' | 'EVALUATION' | 'PHASE-CHANGE';

/** The hook's answer to one CLI action. */
export type Reply =
	| {readonly event: string; readonly context: string}
	| {readonly instructions: string}
	| {readonly error: string};

const STAGES: Readonly<Record<Phase, {readonly event: string; readonly rule: string}>> = {
	'USER-PROMPT': {
		event: 'a new user message arrives',
		rule: 'Before responding, invoke each skill whose description names this task, a file type in it, or a symptom it shows. A description that assigns the work to another skill is not a match. Do not invoke a skill because it could apply: its body stays in context for the rest of the session. Knowing the subject is not a reason to skip a matching skill.',
	},
	'SKILL-LOAD': {
		event: 'a skill is invoked',
		rule: 'Invoking a skill loads its body, not its references. The skill is applied only once every reference whose stated condition holds for the current work has been read; until then it is not applied, and the body does not stand in for an unread reference. Read those references now. Invoke another skill only when the loaded skill assigns part of this task to it by name.',
	},
	EVALUATION: {
		event: 'a file is read',
		rule: "If the file you read is of a kind a skill's description names and that skill is not loaded, invoke it before you act on the file. Otherwise continue. A read alone does not change the kind of work.",
	},
	'PHASE-CHANGE': {
		event: 'a file is edited or written',
		rule: "If the kind of work changed with this edit, for example from implementation to testing, invoke the skills whose descriptions name the new kind and read the loaded skills' references whose condition now holds. A skill loaded earlier is not applied to the new kind of work until those references are read. An edit within the same kind of work is not a change.",
	},
};

const SILENT = 'Act on this rule. Do not quote this reminder or report the check in your reply.';

const renderTrigger = (phase: Phase): string => `<SEF phase="${phase}">\n${STAGES[phase].rule}\n\n${SILENT}\n</SEF>`;

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

const REPLIES: Readonly<Record<string, Reply>> = {
	'session-start': {event: 'SessionStart', context: FRAMEWORK},
	'pre-compact': {instructions: COMPACT_INSTRUCTIONS},
	prompt: {event: 'UserPromptSubmit', context: renderTrigger('USER-PROMPT')},
	read: {event: 'PostToolUse', context: renderTrigger('EVALUATION')},
	write: {event: 'PostToolUse', context: renderTrigger('PHASE-CHANGE')},
	skill: {event: 'PostToolUse', context: renderTrigger('SKILL-LOAD')},
};

/** The CLI actions the hook answers. */
export const ACTIONS: readonly string[] = Object.keys(REPLIES);

/** Returns the reply to a CLI action; a name the table only inherits, such as `constructor`, is an unknown action. */
export function reply(action: string | undefined): Reply {
	const known = action !== undefined && Object.hasOwn(REPLIES, action) ? REPLIES[action] : undefined;
	return known ?? {error: `SEF hook error: Unknown action "${String(action)}". Valid: ${ACTIONS.join(', ')}`};
}

/** Returns the text the hook writes to stdout: instructions as they are, anything else as one JSON line. */
export function serialize(answer: Reply): string {
	if ('instructions' in answer) {
		return answer.instructions;
	}

	if ('error' in answer) {
		return `${JSON.stringify({continue: true, systemMessage: answer.error})}\n`;
	}

	return `${JSON.stringify({hookSpecificOutput: {hookEventName: answer.event, additionalContext: answer.context}})}\n`;
}

if (import.meta.main) {
	process.stdout.write(serialize(reply(process.argv[2])));
}
