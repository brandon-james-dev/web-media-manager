import type { IRImageVariant } from "./IRImageVariant";

/**
 * A compiled image asset.
 *
 * @example
 * ```xml
 * <Image id="chrome-frame" src="assets/images/frame.png" slice="12 12 12 12" />
 * ```
 * @example
 * ```ts
 * const image: IRImage = {
 *   src: "assets/images/frame.png",
 *   slice: [12, 12, 12, 12],
 *   variants: [],
 * };
 * ```
 */
export interface IRImage {
  /** Package path of the base image. */
  readonly src: string;
  /** Nine-slice insets as top, right, bottom and left. */
  readonly slice?: number[];
  /** The high-density variants, in document order. */
  readonly variants: IRImageVariant[];
}
