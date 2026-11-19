import type { IRColor } from "./IRColor";

/**
 * A brush that fills with one color.
 *
 * @example
 * ```xml
 * <SolidBrush id="panel" color="@slot/card" />
 * ```
 * @example
 * ```ts
 * const solid: IRBrush = {
 *   type: "solid",
 *   color: { kind: "slot", slot: "card" },
 * };
 * ```
 */
export interface IRSolidBrush {
  /** Discriminator for a solid fill. */
  readonly type: "solid";
  /** The fill color. */
  readonly color: IRColor;
}
