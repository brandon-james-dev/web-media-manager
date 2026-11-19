import type { IRColor } from "./IRColor";

/**
 * A brush that paints an image, optionally tinted.
 *
 * @example
 * ```xml
 * <ImageBrush id="frame" image="@image/chrome-frame" fit="nineSlice" />
 * ```
 * @example
 * ```ts
 * const brush: IRBrush = {
 *   type: "image",
 *   image: "chrome-frame",
 *   fit: "nineSlice",
 * };
 * ```
 */
export interface IRImageBrush {
  /** Discriminator for an image fill. */
  readonly type: "image";
  /** Id of the image in {@link ThemeIR.images}. */
  readonly image: string;
  /** How the image fills its box: stretch, cover, contain, tile or nineSlice. */
  readonly fit: string;
  /** Multiply-blend tint, when the brush sets one. */
  readonly tint?: IRColor;
}
