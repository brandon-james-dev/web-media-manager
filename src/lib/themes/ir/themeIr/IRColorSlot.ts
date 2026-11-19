import type { PaletteSlot } from "../../componentModel";

/**
 * A color that follows the active palette scheme and the user's accent.
 *
 * @example
 * ```xml
 * <PanelStyle id="inset" background="@slot/card" />
 * ```
 * @example
 * ```ts
 * const card: IRColorSlot = { kind: "slot", slot: "card" };
 * ```
 */
export interface IRColorSlot {
  /** Discriminator for a palette slot. */
  readonly kind: "slot";
  /** The slot the renderer reads from the active palette. */
  readonly slot: PaletteSlot;
}
