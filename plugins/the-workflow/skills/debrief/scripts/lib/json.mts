/** A value as JSON carries it. */
export type Json = string | number | boolean | null | readonly Json[] | JsonObject;

/** A JSON object. */
export type JsonObject = {readonly [key: string]: Json};

/** Parses JSON text; throws a SyntaxError on malformed input. */
export function parseJson(text: string): Json {
	// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- JSON.parse yields only values JSON can carry
	return JSON.parse(text) as Json;
}

/** Narrows a JSON value to an array. */
export const isList = (value: Json | undefined): value is readonly Json[] => Array.isArray(value);

/** Narrows a JSON value to an object. */
export const isObject = (value: Json | undefined): value is JsonObject =>
	typeof value === 'object' && value !== null && !isList(value);

/** Reads a string value, or undefined for any other value. */
export const stringOf = (value: Json | undefined): string | undefined =>
	typeof value === 'string' ? value : undefined;

/** Reads an array value, or an empty list for any other value. */
export const listOf = (value: Json | undefined): readonly Json[] => (isList(value) ? value : []);
