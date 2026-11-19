import type { ReferenceKind } from "../../componentModel";

/**
 * A reference to a theme token or style that the renderer resolves by id.
 *
 * @example
 * ```xml
 * <ButtonStyle id="transport" shadow="@shadow/raised" />
 * ```
 * @example
 * ```ts
 * const shadow: IRRef = { ref: "shadow", id: "raised" };
 * ```
 */
export interface IRRef {
  /** The reference kind, such as `shadow` or `text`. */
  readonly ref: ReferenceKind;
  /** The declared id. */
  readonly id: string;
}
