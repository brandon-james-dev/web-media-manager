/**
 * FNV-1a hashing shared by every host-generated name the theme runtime writes
 * into CSS, so an author id never reaches a stylesheet.
 *
 * @example
 * ```xml
 * <FontFamily id="ui" fallback="sansSerif" />
 * ```
 * @example
 * ```ts
 * fnv1aHex("classic-blue\u0000ui"); // "3f9c1a04"
 * ```
 *
 * @module
 */

/**
 * FNV-1a over the UTF-16 code units of a string, as an unsigned 32-bit
 * number.
 *
 * @example
 * ```xml
 * <ButtonStyle id="transport" />
 * ```
 * @example
 * ```ts
 * fnv1a32("transport"); // 2498462212
 * ```
 */
export function fnv1a32(input: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * The same hash as eight lowercase hex digits, the form the font family names
 * use.
 *
 * @example
 * ```xml
 * <FontFamily id="ui" fallback="sansSerif" />
 * ```
 * @example
 * ```ts
 * fnv1aHex("classic-blue\u0000ui"); // "3f9c1a04"
 * ```
 */
export function fnv1aHex(input: string): string {
  return fnv1a32(input).toString(16).padStart(8, "0");
}

/**
 * The same hash in base 36, padded to at least six characters, the form the
 * generated class names use.
 *
 * @example
 * ```xml
 * <ButtonStyle id="transport" />
 * ```
 * @example
 * ```ts
 * fnv1aBase36("transport"); // "1519jys"
 * ```
 */
export function fnv1aBase36(input: string): string {
  return fnv1a32(input).toString(36).padStart(6, "0");
}
