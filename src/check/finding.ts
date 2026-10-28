export type Severity = 'error' | 'warning';

/** One problem the check reports, located by a path relative to the repository root. */
export type Finding = {
	readonly rule: string;
	readonly severity: Severity;
	readonly file: string;
	readonly line?: number;
	readonly message: string;
};
