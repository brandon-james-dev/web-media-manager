/**
 * One font file of a family.
 *
 * @example
 * ```xml
 * <Face src="assets/fonts/classic-sans-bold.woff2" weight="700" />
 * ```
 * @example
 * ```ts
 * const face: IRFontFace = {
 *   src: "assets/fonts/classic-sans-bold.woff2",
 *   weight: 700,
 *   style: "normal",
 * };
 * ```
 */
export interface IRFontFace {
  /** Package path of the font file. */
  readonly src: string;
  /** Weight from 100 to 900. */
  readonly weight: number;
  /** `normal` or `italic`. */
  readonly style: string;
}
