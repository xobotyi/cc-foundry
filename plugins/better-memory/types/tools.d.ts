import 'claude-code';

declare module 'claude-code' {
	interface McpToolInputs {
		'mcp__better-memory__answer_instruction_proposal': {id: string; answer: 'accepted' | 'declined'};
		'mcp__better-memory__write_entry': {
			name?: unknown;
			type?: unknown;
			description?: unknown;
			fact?: unknown;
			anchors?: unknown;
		};
		'mcp__better-memory__remove_entry': {name?: unknown; reason?: unknown};
	}
}
