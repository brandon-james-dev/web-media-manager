import type { CSSProperties, ReactNode } from "react";
import type { IRNode } from "../../../ir";
import { isVisible } from "../layoutStyle";
import { commonStyle } from "../layoutStyle";
import { elementRegistry } from "./elementRegistry";
import { WidgetPlaceholder } from "./elements/WidgetPlaceholder";
import { useThemeLayoutSnapshot } from "./ThemeRenderContext";

/**
 * What a parent hands a child: the node and the placement style it resolved
 * for it, such as a grid cell or a flex grow share.
 *
 * @example
 * ```xml
 * <Grid columns="220 1*"><TrackList column="1" /></Grid>
 * ```
 * @example
 * ```ts
 * const placement: CSSProperties = { gridColumn: "2 / span 1" };
 * ```
 */
export interface RenderNodeProps {
  /** The node to render. */
  readonly node: IRNode;
  /** The placement and size declarations the parent resolved. */
  readonly placement?: CSSProperties;
}

/**
 * Renders one layout node. An invisible node renders nothing, the node's own
 * size and margin merge over the parent's placement, and an element the
 * registry does not know renders as a widget placeholder.
 *
 * @example
 * ```xml
 * <Panel style="@panel/chrome"><TrackList /></Panel>
 * ```
 * @example
 * ```tsx
 * <RenderNode node={panel} />
 * ```
 */
export function RenderNode({ node, placement }: RenderNodeProps): ReactNode {
  const snapshot = useThemeLayoutSnapshot();
  if (!isVisible(node, snapshot.editMode ? "edit" : "playback")) return null;

  const style: CSSProperties = { ...placement, ...commonStyle(node) };
  const Component = elementRegistry[node.element];
  if (Component === undefined) {
    return <WidgetPlaceholder node={node} style={style} />;
  }
  return <Component node={node} style={style} />;
}
