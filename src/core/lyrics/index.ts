/**
 * Lyrics lookup (core).
 *
 * Providers register in a registry port, so a built-in provider and an
 * installed plugin provider are searched and ranked the same way. The ranking
 * reads only provider-neutral result fields.
 *
 * @example
 * ```ts
 * const results = await searchLyrics("lrclib", { title, artist });
 * const ranked = rankLyricsResults(results ?? [], { title, artist });
 * ```
 */
export { createLyricsProviderRegistry } from "./createLyricsProviderRegistry";
export { rankLyricsResults } from "./rankLyricsResults";
export type { IRankedLyricsResult } from "./rankLyricsResults";
export { searchLyrics } from "./searchLyrics";
