import type { IRStyleState } from "./IRStyleState";
import type { IRValue } from "./IRValue";

/**
 * A compiled button, slider or panel style. `basedOn` is flattened into
 * `base`, ancestor first, and states are merged by name and value.
 *
 * @example
 * ```xml
 * <ButtonStyle id="transport-touch" basedOn="@button/transport"
 *   minWidth="44" minHeight="44" />
 * ```
 * @example
 * ```ts
 * const style: IRStyle = {
 *   base: { minWidth: 44, minHeight: 44 },
 *   states: [],
 * };
 * ```
 */
export interface IRStyle {
  /** The style's own properties with every ancestor applied. */
  readonly base: Record<string, IRValue>;
  /** The states of the style and its ancestors, child last. */
  readonly states: IRStyleState[];
}
