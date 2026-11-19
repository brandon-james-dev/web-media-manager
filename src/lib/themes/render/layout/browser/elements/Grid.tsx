import { gridItemStyle, gridStyle } from "../../layoutStyle";
import type { ElementProps } from "../elementProps";
import { RenderNode } from "../renderNode";

/**
 * Places children in cells of a CSS grid. The track list, the gaps and each
 * child's cell and span come from the node, so overlapping children stack in
 * document order.
 *
 * @example
 * ```xml
 * <Grid columns="220 1*" rows="1* 200" columnGap="8">
 *   <LibraryBrowser row="0" column="0" rowSpan="2" />
 *   <TrackList row="0" column="1" />
 * </Grid>
 * ```
 * @example
 * ```tsx
 * <RenderNode node={grid} />
 * ```
 */
export function Grid({ node, style }: ElementProps) {
  return (
    <div style={{ ...gridStyle(node), ...style }}>
      {node.children.map((child, index) => (
        <RenderNode key={index} node={child} placement={gridItemStyle(child)} />
      ))}
    </div>
  );
}
