import { attrString } from "../../attributes";
import { stackItemStyle, stackStyle } from "../../layoutStyle";
import type { ElementProps } from "../elementProps";
import { RenderNode } from "../renderNode";

/**
 * Arranges children in a line. The container is a flex box whose direction,
 * gap, alignment and overflow come from the node, and each child carries its
 * own `grow` share.
 *
 * @example
 * ```xml
 * <Stack orientation="horizontal" gap="4" align="center">
 *   <SearchBox grow="1" />
 * </Stack>
 * ```
 * @example
 * ```tsx
 * <RenderNode node={stack} />
 * ```
 */
export function Stack({ node, style }: ElementProps) {
  const horizontal = attrString(node, "orientation") === "horizontal";
  return (
    <div style={{ ...stackStyle(node), ...style }}>
      {node.children.map((child, index) => (
        <RenderNode
          key={index}
          node={child}
          placement={stackItemStyle(child, horizontal)}
        />
      ))}
    </div>
  );
}
