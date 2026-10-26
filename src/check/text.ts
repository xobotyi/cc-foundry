/** The 1-based line of the first occurrence of `needle` in `text`, or undefined when it does not occur. */
export function lineOf(text: string, needle: string): number | undefined {
  const index = text.indexOf(needle);
  if (index === -1) return undefined;
  return lineAt(text, index);
}

/** The 1-based line that holds the character at `index`. */
export function lineAt(text: string, index: number): number {
  let line = 1;
  for (let i = text.indexOf("\n"); i !== -1 && i < index; i = text.indexOf("\n", i + 1)) {
    line++;
  }
  return line;
}
