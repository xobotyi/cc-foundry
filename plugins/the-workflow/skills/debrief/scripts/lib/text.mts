/** The length a record's text is cut to. */
export const TEXT_LIMIT = 2000;

/** Cuts text to `limit` characters and marks the cut with an ellipsis. */
export const truncate = (text: string, limit: number): string =>
	text.length > limit ? `${text.slice(0, limit)}…` : text;

/** Keeps the last `limit` characters of text and marks the cut with a leading ellipsis. */
export const tail = (text: string, limit: number): string => (text.length > limit ? `…${text.slice(-limit)}` : text);
