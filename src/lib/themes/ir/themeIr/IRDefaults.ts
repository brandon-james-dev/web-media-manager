/**
 * The styles the host falls back to when an element names none.
 *
 * @example
 * ```xml
 * <Defaults button="@button/standard" panel="@panel/content" text="@text/body" />
 * ```
 * @example
 * ```ts
 * const defaults: IRDefaults = {
 *   button: "standard",
 *   panel: "content",
 *   text: "body",
 * };
 * ```
 */
export interface IRDefaults {
  /** Id of the default button style. */
  button?: string;
  /** Id of the default panel style. */
  panel?: string;
  /** Id of the default text style. */
  text?: string;
}
