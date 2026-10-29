/** The length a record's text is cut to. */
export const TEXT_LIMIT = 2000;

/** Cuts text to `limit` characters and marks the cut with an ellipsis. */
export const truncate = (text: string, limit: number): string =>
	text.length > limit ? `${text.slice(0, limit)}…` : text;

/** Keeps the last `limit` characters of text and marks the cut with a leading ellipsis. */
export const tail = (text: string, limit: number): string => (text.length > limit ? `…${text.slice(-limit)}` : text);

const words = (text: string): string[] =>
	text
		.toLowerCase()
		.split(/[^\p{L}\p{N}]+/v)
		.filter((word) => word !== '');

/** Returns how alike two texts are, 0 to 1: twice their longest common word subsequence over their word count. */
export function similarity(a: string, b: string): number {
	const first = words(a);
	const second = words(b);
	if (first.length + second.length === 0) {
		return 1;
	}

	let previous = Array.from({length: second.length + 1}, () => 0);
	let current = Array.from({length: second.length + 1}, () => 0);
	for (const word of first) {
		for (const [j, other] of second.entries()) {
			current[j + 1] = word === other ? (previous[j] ?? 0) + 1 : Math.max(previous[j + 1] ?? 0, current[j] ?? 0);
		}
		[previous, current] = [current, previous];
	}
	return (2 * (previous.at(-1) ?? 0)) / (first.length + second.length);
}
