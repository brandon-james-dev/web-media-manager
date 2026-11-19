import { Component } from "react";
import type { CSSProperties, ErrorInfo, ReactNode } from "react";
import { cn } from "cn";
import { getElementDef } from "@/lib/themes/componentModel";
import { attrRef, resolveWidgetMinSize } from "@/lib/themes/render";
import {
  useThemeRender,
  type ElementProps,
  WidgetPlaceholder,
} from "@/lib/themes/render/browser";

/**
 * The outer box of an app widget: the placement the parent resolved, the
 * widget's minimum size, the `panel` style it names, and an error boundary
 * that swaps a failing widget for the neutral placeholder instead of taking
 * the page down.
 *
 * @example
 * ```xml
 * <SeekBar grow="1" slider="@slider/seek" panel="@panel/inset" />
 * ```
 * @example
 * ```tsx
 * <WidgetFrame node={node} style={style}>
 *   <ThemeSeekBar node={node} />
 * </WidgetFrame>
 * ```
 */
export function WidgetFrame({
  node,
  style,
  children,
}: ElementProps & { readonly children: ReactNode }) {
  return (
    <WidgetErrorBoundary node={node} style={style}>
      <WidgetFrameBody node={node} style={style}>
        {children}
      </WidgetFrameBody>
    </WidgetErrorBoundary>
  );
}

/** The frame itself, kept apart so the boundary can replace all of it. */
function WidgetFrameBody({
  node,
  style,
  children,
}: ElementProps & { readonly children: ReactNode }) {
  const { stylesheet } = useThemeRender();
  const minSize = resolveWidgetMinSize(getElementDef(node.element), node);
  const panelId = attrRef(node, "panel", "panel");
  const panelClass =
    panelId === undefined ? undefined : stylesheet.classes.panel[panelId];

  return (
    <div
      className={cn(
        "flex min-h-0 min-w-0 flex-col overflow-hidden",
        panelClass
      )}
      style={{
        minWidth: minSize?.width,
        minHeight: minSize?.height,
        ...style,
      }}
      data-widget={node.element}
    >
      {children}
    </div>
  );
}

/** What the boundary needs to draw the placeholder in place of a failure. */
interface WidgetErrorBoundaryProps {
  readonly node: ElementProps["node"];
  readonly style?: CSSProperties;
  readonly children: ReactNode;
}

/**
 * The boundary that keeps one broken widget from unmounting the layout. It
 * logs the failure and renders the neutral placeholder in its place.
 *
 * @example
 * ```xml
 * <Lyrics align="center" text="@text/body" />
 * ```
 * @example
 * ```tsx
 * <WidgetErrorBoundary node={lyricsNode}>{children}</WidgetErrorBoundary>
 * ```
 */
class WidgetErrorBoundary extends Component<
  WidgetErrorBoundaryProps,
  { readonly failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.warn(`[themes] ${this.props.node.element} failed`, error, info);
  }

  render(): ReactNode {
    if (this.state.failed) {
      return (
        <WidgetPlaceholder node={this.props.node} style={this.props.style} />
      );
    }
    return this.props.children;
  }
}
