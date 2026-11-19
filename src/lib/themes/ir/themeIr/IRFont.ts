import type { IRFontFace } from "./IRFontFace";

/**
 * A compiled font family.
 *
 * @example
 * ```xml
 * <FontFamily id="ui" fallback="sansSerif" />
 * ```
 * @example
 * ```ts
 * const font: IRFont = { fallback: "sansSerif", faces: [] };
 * ```
 */
export interface IRFont {
  /** The generic stack used when no face loads. */
  readonly fallback: string;
  /** The family's faces, in document order. */
  readonly faces: IRFontFace[];
}
