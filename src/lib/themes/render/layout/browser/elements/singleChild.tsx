import type { ElementProps } from "../elementProps";
import { RenderNode } from "../renderNode";

/**
 * Renders the single child of a structural element. `Shell`, `Page`, `Tab`
 * and `TabStripEnd` only wrap one layout element, so they add no box of their
 * own and pass the placement straight through.
 *
 * @example
 * ```xml
 * <Page id="library" titleKey="navigation.library"><TrackList /></Page>
 * ```
 * @example
 * ```ts
 * elementRegistry.Page; // SingleChild
 * ```
 */
export function SingleChild({ node, style }: ElementProps) {
  const child = node.children[0];
  if (child === undefined) return null;
  return <RenderNode node={child} placement={style} />;
}
