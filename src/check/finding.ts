export type Severity = 'error' | 'warning';

/** One problem the check reports, located by a path relative to the repository root. */
export interface Finding {
	rule: string;
	severity: Severity;
	file: string;
	line?: number;
	message: string;
}
