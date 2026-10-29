import {isObject, stringOf} from './json.mts';
import type {Entry} from './transcript.mts';

const SKILL_BODY_PREFIX = 'Base directory for this skill:';
const COMMAND_NAME = /<command-name>\/([^<\s]+)<\/command-name>/;

/**
 * The skills a session has loaded so far: called through the Skill tool, typed as a command, or re-attached after a
 * compaction. A typed command counts only when the skill body follows it, so a built-in command such as `/compact`
 * does not.
 */
export class LoadedSkills {
	readonly #skills = new Set<string>();
	#typedCommand: string | undefined;

	/** Takes in one transcript entry. */
	observe(entry: Entry): void {
		switch (entry.kind) {
			case 'assistant': {
				for (const block of entry.blocks) {
					const input = block.type === 'tool_use' && block.name === 'Skill' ? block.input : undefined;
					const skill = isObject(input) ? stringOf(input.skill) : undefined;
					if (skill !== undefined) {
						this.#skills.add(skill);
					}
				}
				break;
			}
			case 'attachment': {
				if (entry.attachment.kind === 'invoked-skills') {
					for (const skill of entry.attachment.skills) {
						this.#skills.add(skill);
					}
				}
				break;
			}
			case 'user': {
				if (this.#typedCommand !== undefined && entry.isMeta && entry.text.startsWith(SKILL_BODY_PREFIX)) {
					this.#skills.add(this.#typedCommand);
				}
				this.#typedCommand = COMMAND_NAME.exec(entry.text)?.[1];
				break;
			}
			case 'system':
			case 'unread': {
				break;
			}
		}
	}

	/** Returns the skills loaded so far, in the order they loaded. */
	list(): string[] {
		return [...this.#skills];
	}
}
