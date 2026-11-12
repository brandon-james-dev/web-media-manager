export const ALPHABET_LETTERS = ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];

/** Index letter of a string: A-Z (diacritics folded) or "#" for anything else. */
export function firstLetter(text: string | null | undefined): string | null {
  const first = text?.trim().normalize("NFD").charAt(0).toUpperCase();
  if (!first) return null;
  return /[A-Z]/.test(first) ? first : "#";
}

/** Position of the first key starting with each letter, in list order. */
export function buildLetterIndex(
  keys: readonly (string | null | undefined)[]
): Map<string, number> {
  const index = new Map<string, number>();
  keys.forEach((key, i) => {
    const letter = firstLetter(key);
    if (letter && !index.has(letter)) index.set(letter, i);
  });
  return index;
}

/**
 * Scroll a ScrollArea so the item at `index` of `count` uniform items is at
 * the top. Proportional rather than per-element so it also works for
 * virtualized lists and multi-column grids.
 */
export function scrollListToIndex(
  root: HTMLElement | null,
  index: number,
  count: number
) {
  const viewport = root?.querySelector<HTMLElement>(
    '[data-slot="scroll-area-viewport"]'
  );
  if (!viewport || count <= 0) return;
  const max = viewport.scrollHeight - viewport.clientHeight;
  viewport.scrollTop = Math.min(max, (index / count) * viewport.scrollHeight);
}
