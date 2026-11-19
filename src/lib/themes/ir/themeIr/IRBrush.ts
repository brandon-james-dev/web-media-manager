import type { IRImageBrush } from "./IRImageBrush";
import type { IRLinearBrush } from "./IRLinearBrush";
import type { IRSolidBrush } from "./IRSolidBrush";

/**
 * A compiled brush from `<Brushes>`.
 *
 * @example
 * ```xml
 * <Brushes>
 *   <SolidBrush id="panel" color="@slot/card" />
 * </Brushes>
 * ```
 * @example
 * ```ts
 * const brush: IRBrush = {
 *   type: "solid",
 *   color: { kind: "slot", slot: "card" },
 * };
 * ```
 */
export type IRBrush = IRSolidBrush | IRLinearBrush | IRImageBrush;
