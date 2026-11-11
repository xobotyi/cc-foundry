import type {On} from 'claude-code';

type Phase = 'USER-PROMPT' | 'SKILL-LOAD' | 'EVALUATION' | 'PHASE-CHANGE';

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

const reminderOf = (phase: Phase): string => `<SEF phase="${phase}">\n${STAGES[phase].rule}\n\n${SILENT}\n</SEF>`;

const RULES_BLOCK = Object.entries(STAGES)
	.map(([phase, stage]) => `- ${phase} (when ${stage.event}): ${stage.rule}`)
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

const TOOL_PHASES: Readonly<Record<string, Phase>> = {
	Read: 'EVALUATION',
	Edit: 'PHASE-CHANGE',
	Write: 'PHASE-CHANGE',
	Skill: 'SKILL-LOAD',
};

/**
 * Registers the Skill Enforcement Framework: each prompt the person types enters with the USER-PROMPT reminder, and a
 * successful Read, Edit, Write, or Skill call returns with the reminder of its checkpoint, in the main conversation
 * and in a subagent's alike. A prompt the person did not type, such as a task notification, enters as it is.
 *
 * The framework enters with the first typed prompt of a conversation: at the start of the process, and again after
 * `/clear`, a resume, or a compaction of the main conversation. A compaction is told to drop the framework and the
 * reminders and to keep the list of skill references read.
 *
 * @param on the engine's registrar
 */
export function register(on: On): void {
	let hasFramework = false;

	on('prompt.submit', async ($, e, next) => {
		if (e.isMeta === true || e.origin.kind === 'task-notification') return next(e);

		const context = [...(e.context ?? []), ...(hasFramework ? [] : [FRAMEWORK]), reminderOf('USER-PROMPT')];
		const submitted = await next({...e, context});
		if (submitted.drop === undefined) hasFramework = true;

		return submitted;
	});

	on('tool.call', {tool: ['Read', 'Edit', 'Write', 'Skill']}, async ($, e, next) => {
		const call = await next(e);
		const phase = TOOL_PHASES[e.tool];
		if (phase === undefined || call.deny !== undefined || call.isError === true) return call;

		return {...call, context: [...(call.context ?? []), reminderOf(phase)]};
	});

	on('session.compact', async ($, e, next) => {
		const instructions =
			e.instructions === undefined ? COMPACT_INSTRUCTIONS : `${e.instructions}\n\n${COMPACT_INSTRUCTIONS}`;
		const compaction = await next({...e, instructions});
		if (e.agentId === undefined && compaction.skip === undefined) hasFramework = false;

		return compaction;
	});

	on('session.end', async ($, e, next) => {
		if (e.reason === 'clear' || e.reason === 'resume') hasFramework = false;

		return next(e);
	});
}
