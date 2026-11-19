import type { IRValue } from "./IRValue";

/**
 * One static appearance of a button, slider or panel style.
 *
 * @example
 * ```xml
 * <State name="pressed" background="@brush/chrome-gloss-down" />
 * ```
 * @example
 * ```ts
 * const state: IRStyleState = {
 *   name: "pressed",
 *   properties: { opacity: 0.4 },
 * };
 * ```
 */
export interface IRStyleState {
  /** The state name, such as `hover` or `active`. */
  readonly name: string;
  /** The command state value an `active` state matches. */
  readonly value?: string;
  /** The properties the state overrides. */
  properties: Record<string, IRValue>;
}
