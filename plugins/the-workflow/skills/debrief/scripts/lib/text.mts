/** The length a record's text is cut to. */
export const TEXT_LIMIT = 2000;

/** Cuts text to `limit` characters and marks the cut with an ellipsis. */
export const truncate = (text: string, limit: number): string =>
	text.length > limit ? `${text.slice(0, limit)}…` : text;
