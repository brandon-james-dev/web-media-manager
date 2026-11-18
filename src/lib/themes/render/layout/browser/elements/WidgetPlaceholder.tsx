import { cn } from "cn";
import { getElementDef } from "../../../../componentModel";
import { attrRef } from "../../attributes";
import { resolveWidgetMinSize } from "../../widgetSize";
import type { ElementProps } from "../elementProps";
import { useThemeRender } from "../ThemeRenderContext";

/**
 * The neutral box a widget renders as until the widget itself ships. It
 * honours the widget's minimum size and the `panel` style it names, so the
 * layout keeps its shape.
 *
 * @example
 * ```xml
 * <TrackList variant="table" panel="@panel/inset" />
 * ```
 * @example
 * ```tsx
 * <WidgetPlaceholder node={trackList} />
 * ```
 */
export function WidgetPlaceholder({ node, style }: ElementProps) {
  const { stylesheet } = useThemeRender();
  const minSize = resolveWidgetMinSize(getElementDef(node.element), node);
  const panelId = attrRef(node, "panel", "panel");
  const panelClass =
    panelId === undefined ? undefined : stylesheet.classes.panel[panelId];

  return (
    <div
      className={cn(
        "flex items-center justify-center border border-dashed border-muted-foreground/40 text-xs text-muted-foreground",
        panelClass
      )}
      style={{
        minWidth: minSize?.width,
        minHeight: minSize?.height,
        ...style,
      }}
      data-widget={node.element}
    >
      {node.element}
    </div>
  );
}
