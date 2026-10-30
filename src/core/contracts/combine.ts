import type { MusicSource } from "./sources";

/**
 * Helpers for combining music sources into one library view.
 * Pure functions over JSON-safe contracts — portable to every binding.
 *
 * Sources never merge their *items* directly (two servers can vend the same
 * native id); items only combine once source-qualified via `sourceUri()`.
 * These helpers define *which* sources participate and *whose* version of a
 * combined view wins on collision: lowest priority value wins, ties break
 * by source id for determinism.
 */

/** Same comparator in both places so ordering is always identical. */
function byPrecedence(a: MusicSource, b: MusicSource): number {
  return a.priority - b.priority || a.id.localeCompare(b.id);
}

/** Sort sources into merge order: ascending priority, then stable by id. */
export function mergeOrder(sources: MusicSource[]): MusicSource[] {
  return [...sources].sort(byPrecedence);
}

/** Sources that participate in the combined library, in merge order. */
export function enabledSources(sources: MusicSource[]): MusicSource[] {
  return mergeOrder(sources).filter((s) => s.enabled);
}

/**
 * Combine per-source result lists into one ordered list, deduplicated by
 * `keyOf`. Lower-priority-numbered sources win collisions.
 */
export function combineOrdered<T>(
  perSource: Array<{ source: MusicSource; items: T[] }>,
  keyOf: (item: T) => string
): T[] {
  const sorted = [...perSource].sort((a, b) =>
    byPrecedence(a.source, b.source)
  );
  const seen = new Set<string>();
  const out: T[] = [];
  for (const { items } of sorted) {
    for (const item of items) {
      const key = keyOf(item);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}
