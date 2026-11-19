import type { IRGradientStop } from "./IRGradientStop";

/**
 * A gradient brush along an angle in the CSS convention.
 *
 * @example
 * ```xml
 * <LinearGradient id="chrome-gloss" angle="180">
 *   <Stop offset="0" color="#5f8fe0" />
 *   <Stop offset="1" color="#1c3f94" />
 * </LinearGradient>
 * ```
 * @example
 * ```ts
 * const gradient: IRBrush = {
 *   type: "linear",
 *   angle: 180,
 *   stops: [
 *     { offset: 0, color: { kind: "literal", value: "#5f8fe0ff" } },
 *     { offset: 1, color: { kind: "literal", value: "#1c3f94ff" } },
 *   ],
 * };
 * ```
 */
export interface IRLinearBrush {
  /** Discriminator for a linear gradient. */
  readonly type: "linear";
  /** Gradient angle in degrees, 0 to 359. */
  readonly angle: number;
  /** Two to eight stops, in non-decreasing offset order. */
  readonly stops: IRGradientStop[];
}
