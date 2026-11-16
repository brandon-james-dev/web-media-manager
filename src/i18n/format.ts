/**
 * Positional template formatting.
 *
 * A template resource uses `{0}`, `{1}`, ... for the values a caller supplies,
 * in the order the registry declares them. `{{` and `}}` are the escapes for a
 * literal brace, so a translation can talk about braces without becoming a
 * placeholder. A placeholder with no matching argument is left untouched
 * rather than blanked, which keeps a partially-filled template readable.
 */

import type { ResourceArg } from "./resources";

/** A placeholder at the current scan position. */
const PLACEHOLDER_AT = /^\{(\d+)\}/;

function walk(
  template: string,
  onPlaceholder: (index: number, raw: string) => string
): string {
  let out = "";
  let position = 0;

  while (position < template.length) {
    const char = template[position];

    if (char === "{" && template[position + 1] === "{") {
      out += "{";
      position += 2;
      continue;
    }

    if (char === "}" && template[position + 1] === "}") {
      out += "}";
      position += 2;
      continue;
    }

    if (char === "{") {
      const match = PLACEHOLDER_AT.exec(template.slice(position));
      if (match) {
        out += onPlaceholder(Number(match[1]), match[0]);
        position += match[0].length;
        continue;
      }
    }

    out += char;
    position += 1;
  }

  return out;
}

/** Fills `{n}` with `args[n]`; unknown indices and escapes are preserved. */
export function formatTemplate(
  template: string,
  args: readonly ResourceArg[]
): string {
  return walk(template, (index, raw) => {
    const value = args[index];
    return value === undefined ? raw : String(value);
  });
}

/** Placeholder indices a template uses, sorted and de-duplicated. */
export function extractPlaceholders(template: string): number[] {
  const indices = new Set<number>();
  walk(template, (index) => {
    indices.add(index);
    return "";
  });
  return [...indices].sort((a, b) => a - b);
}
