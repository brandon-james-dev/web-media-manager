import { attrRef } from "@/lib/themes/render";
import { useThemeRender } from "@/lib/themes/render/browser";
import type { IRNode } from "@/lib/themes/ir";

/**
 * The class of the text style a widget attribute references, such as
 * `titleText` or `rowText`. An unset reference, or one the theme does not
 * declare, falls back to the stylesheet's default text class.
 *
 * @example
 * ```xml
 * <TrackInfo fields="title artist" titleText="@text/track" detailText="@text/caption" />
 * ```
 * @example
 * ```ts
 * const titleClass = useThemeTextClass(node, "titleText");
 * ```
 */
export function useThemeTextClass(node: IRNode, attribute: string): string {
  const { stylesheet } = useThemeRender();
  const id = attrRef(node, attribute, "text");
  if (id === undefined) return stylesheet.defaults.text;
  return stylesheet.classes.text[id] ?? stylesheet.defaults.text;
}
