/**
 * Returns the 1-based position of an element's `<` from the parser position
 * reported right after its name. When the name ends a line, the position is
 * taken from the end of the previous line.
 *
 * @example
 * ```xml
 * <Shell><PageHost /></Shell>
 * ```
 * @example
 * ```ts
 * parser.on("opentagstart", (tag) => {
 *   starts.push(tagStart(lines, parser.line, parser.column, tag.name));
 * });
 * ```
 */
export function tagStart(
  lines: string[],
  line: number,
  column: number,
  name: string
): { line: number; column: number } {
  if (column > 0) return { line, column: column - name.length - 1 };
  const previous = line - 1;
  return {
    line: previous,
    column: [...(lines[previous - 1] ?? "")].length - name.length,
  };
}
