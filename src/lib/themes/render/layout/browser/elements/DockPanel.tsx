import type { CSSProperties, ReactNode } from "react";
import type { DockTree } from "../../planDock";
import { FILL_PLACEMENT } from "../../layoutStyle";
import { planDockTree } from "../../planDock";
import type { ElementProps } from "../elementProps";
import { RenderNode } from "../renderNode";

/**
 * Docks children to its edges in document order and gives the remaining
 * space to the fill child. Each docked child wraps the rest in a flex
 * container, and `start`/`end` use a row so they follow reading direction.
 *
 * @example
 * ```xml
 * <DockPanel>
 *   <Panel dock="top" height="56" />
 *   <Panel dock="start" width="220" />
 *   <PageHost dock="fill" />
 * </DockPanel>
 * ```
 * @example
 * ```tsx
 * <RenderNode node={dockPanel} />
 * ```
 */
export function DockPanel({ node, style }: ElementProps) {
  return <>{renderDock(planDockTree(node.children), style ?? {})}</>;
}

/** A docked edge child keeps its own size instead of shrinking. */
const DOCKED_PLACEMENT: CSSProperties = { flexShrink: 0 };

/** Renders one level of the dock nesting. */
function renderDock(tree: DockTree, style: CSSProperties): ReactNode {
  if (tree.kind === "fill") {
    if (tree.node === undefined) return null;
    return <RenderNode node={tree.node} placement={style} />;
  }

  const horizontal = tree.edge === "start" || tree.edge === "end";
  const reversed = tree.edge === "end" || tree.edge === "bottom";
  const direction = horizontal
    ? reversed
      ? "row-reverse"
      : "row"
    : reversed
      ? "column-reverse"
      : "column";

  return (
    <div style={{ ...style, display: "flex", flexDirection: direction }}>
      <RenderNode node={tree.node} placement={DOCKED_PLACEMENT} />
      {renderDock(tree.rest, FILL_PLACEMENT)}
    </div>
  );
}
