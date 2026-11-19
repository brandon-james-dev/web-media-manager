import type { IRColorLiteral } from "./IRColorLiteral";
import type { IRColorSlot } from "./IRColorSlot";

/**
 * A compiled color: either a literal or a palette slot. `@color/` chains are
 * resolved to literals, so a literal never points at another color.
 *
 * @example
 * ```xml
 * <ButtonStyle id="nav" foreground="@color/blue-300" background="@slot/card" />
 * ```
 * @example
 * ```ts
 * const foreground: IRColor = { kind: "slot", slot: "foreground" };
 * ```
 */
export type IRColor = IRColorLiteral | IRColorSlot;
