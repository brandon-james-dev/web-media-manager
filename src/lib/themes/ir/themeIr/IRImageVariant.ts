/**
 * A higher-density copy of an image.
 *
 * @example
 * ```xml
 * <Variant scale="2" src="assets/images/frame@2x.png" />
 * ```
 * @example
 * ```ts
 * const variant: IRImageVariant = {
 *   scale: 2,
 *   src: "assets/images/frame@2x.png",
 * };
 * ```
 */
export interface IRImageVariant {
  /** Density multiplier, 2 or 3. */
  readonly scale: number;
  /** Package path of the variant file. */
  readonly src: string;
}
