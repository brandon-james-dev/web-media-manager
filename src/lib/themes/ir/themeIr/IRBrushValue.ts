import type { IRColor } from "./IRColor";

/**
 * A compiled brush value: a color, or a reference to a brush declared in
 * `<Brushes>`.
 *
 * @example
 * ```xml
 * <ButtonStyle id="transport" background="@brush/chrome-gloss" />
 * ```
 * @example
 * ```ts
 * const background: IRBrushValue = { kind: "brush", id: "chrome-gloss" };
 * ```
 */
export type IRBrushValue =
  | { readonly kind: "color"; readonly color: IRColor }
  | { readonly kind: "brush"; readonly id: string };
