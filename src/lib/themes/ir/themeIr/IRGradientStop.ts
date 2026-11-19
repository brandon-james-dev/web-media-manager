import type { IRColor } from "./IRColor";

/**
 * One stop of a linear gradient.
 *
 * @example
 * ```xml
 * <Stop offset="0.5" color="@color/blue-600" />
 * ```
 * @example
 * ```ts
 * const stop: IRGradientStop = {
 *   offset: 0.5,
 *   color: { kind: "literal", value: "#2f5fb8ff" },
 * };
 * ```
 */
export interface IRGradientStop {
  /** Position along the gradient, from 0 to 1. */
  readonly offset: number;
  /** The color at this position. */
  readonly color: IRColor;
}
