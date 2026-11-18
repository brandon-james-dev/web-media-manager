import { fnv1aBase36 } from "../../runtime/hash";

/**
 * The host-generated class name of one theme style or layout node. The name
 * hashes the theme id, theme version, kind and author id, so an author id
 * never reaches CSS and two themes cannot collide.
 *
 * @example
 * ```xml
 * <ButtonStyle id="transport" background="@brush/chrome-gloss" />
 * ```
 * @example
 * ```ts
 * themeClassName("classic-blue", "1.2.0", "button", "transport");
 * // "wmm-t-1x9f2a"
 * ```
 */
export function themeClassName(
  themeId: string,
  themeVersion: string,
  kind: string,
  id: string
): string {
  return `wmm-t-${fnv1aBase36(
    `${themeId}\u0000${themeVersion}\u0000${kind}\u0000${id}`
  )}`;
}
