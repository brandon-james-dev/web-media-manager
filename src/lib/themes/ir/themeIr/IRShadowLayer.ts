import type { IRColor } from "./IRColor";

/**
 * One layer of a shadow. Layer 0 is the `<Shadow>`'s own attributes.
 *
 * @example
 * ```xml
 * <Shadow id="raised" x="0" y="2" blur="6" spread="0" color="#00000066" />
 * ```
 * @example
 * ```ts
 * const layer: IRShadowLayer = {
 *   x: 0,
 *   y: 2,
 *   blur: 6,
 *   spread: 0,
 *   color: { kind: "literal", value: "#00000066" },
 *   inset: false,
 * };
 * ```
 */
export interface IRShadowLayer {
  /** Horizontal offset in pixels. */
  readonly x: number;
  /** Vertical offset in pixels. */
  readonly y: number;
  /** Blur radius in pixels. */
  readonly blur: number;
  /** Spread in pixels. */
  readonly spread: number;
  /** The layer color. */
  readonly color: IRColor;
  /** Whether the shadow draws inside its box. */
  readonly inset: boolean;
}
