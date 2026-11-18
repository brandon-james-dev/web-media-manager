import { useRef, useState } from "react";
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { cn } from "cn";
import { useTranslation } from "@/i18n";
import { attrBool, attrNumber, attrRef, attrString } from "../../attributes";
import { FILL_PLACEMENT } from "../../layoutStyle";
import {
  clampPanelWidth,
  panelResizeStep,
  panelWidthBounds,
  panelWidthKey,
} from "../../panelResize";
import type { ElementProps } from "../elementProps";
import { RenderNode } from "../renderNode";
import { useThemeLayoutSnapshot, useThemeRender } from "../ThemeRenderContext";
import {
  FULLSCREEN_FADE_STYLE,
  useFullscreenHidden,
} from "../useFullscreenHidden";

/**
 * A decorated container with zero or one child. The panel style class comes
 * from the theme's `@panel/...` table, with the node's inline overrides on
 * top. A collapsible panel renders nothing until its id is open in the layout
 * state. A `hideInFullscreen` panel steps aside a few seconds after the
 * document enters full screen, fades out, and is then left out. A resizable panel docked to `start` or `end` draws a drag
 * handle on its inner edge and remembers the width the user dragged it to.
 *
 * @example
 * ```xml
 * <Panel id="sidebar" dock="end" width="320" collapsible="true" style="@panel/sidebar" />
 * <Panel id="library-nav" dock="start" width="200" resizable="true" minWidth="140" maxWidth="420" />
 * <Panel dock="top" hideInFullscreen="true" style="@panel/tab-strip" />
 * ```
 * @example
 * ```tsx
 * <RenderNode node={panel} />
 * ```
 */
export function Panel({ node, style }: ElementProps) {
  const { stylesheet, ir, formFactor } = useThemeRender();
  const snapshot = useThemeLayoutSnapshot();
  const { get } = useTranslation();

  const id = attrString(node, "id");
  const dock = attrString(node, "dock");
  const bounds = panelWidthBounds(node);
  const layoutWidth = clampPanelWidth(
    attrNumber(node, "width") ?? bounds.min,
    bounds
  );
  const storageKey =
    id === undefined ? undefined : panelWidthKey(ir.themeId, formFactor, id);
  const [sized, setSized] = useState<{
    readonly key: string | undefined;
    readonly width: number | undefined;
  }>(() => ({ key: storageKey, width: storedPanelWidth(storageKey, bounds) }));
  const width =
    sized.key === storageKey
      ? sized.width
      : storedPanelWidth(storageKey, bounds);
  const setWidth = (next: number): void =>
    setSized({ key: storageKey, width: next });
  const drag = useRef<
    { readonly x: number; readonly width: number } | undefined
  >(undefined);

  const collapsible = attrBool(node, "collapsible") === true;
  const fullscreenHidden = useFullscreenHidden(
    attrBool(node, "hideInFullscreen") === true,
    snapshot.fullscreen
  );

  if (collapsible && (id === undefined || !snapshot.openPanels.has(id))) {
    return null;
  }

  if (fullscreenHidden === "hidden") {
    return null;
  }

  const styleId = attrRef(node, "style", "panel");
  const panelClass =
    styleId === undefined
      ? stylesheet.defaults.panel
      : (stylesheet.classes.panel[styleId] ?? stylesheet.defaults.panel);
  const className = cn(panelClass, stylesheet.nodeClasses.get(node));
  const child = node.children[0];

  const currentWidth = width ?? layoutWidth;
  const resizable =
    attrBool(node, "resizable") === true &&
    (dock === "start" || dock === "end");

  function commitWidth(next: number): void {
    const clamped = clampPanelWidth(next, bounds);
    setWidth(clamped);
    if (storageKey === undefined) return;
    try {
      localStorage.setItem(storageKey, String(clamped));
    } catch {
      return;
    }
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLElement>): void {
    drag.current = { x: event.clientX, width: currentWidth };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLElement>): void {
    const start = drag.current;
    if (start === undefined) return;
    const delta = event.clientX - start.x;
    commitWidth(dock === "end" ? start.width - delta : start.width + delta);
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLElement>): void {
    if (drag.current === undefined) return;
    drag.current = undefined;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLElement>): void {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const edge = dock === "end" ? "end" : "start";
    commitWidth(currentWidth + panelResizeStep(edge, event.key));
  }

  const panelStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    ...style,
    ...(width === undefined ? {} : { width: `${width}px` }),
    ...(resizable ? { position: "relative" } : {}),
    ...(fullscreenHidden === "fading" ? FULLSCREEN_FADE_STYLE : {}),
  };

  return (
    <div className={className} style={panelStyle} data-panel-id={id}>
      {child === undefined ? null : (
        <RenderNode node={child} placement={FILL_PLACEMENT} />
      )}
      {resizable ? (
        <span
          role="separator"
          aria-orientation="vertical"
          aria-label={get("layout.resizePanel")}
          aria-valuenow={currentWidth}
          tabIndex={0}
          className={cn(
            "absolute inset-y-0 w-1.5 cursor-col-resize touch-none select-none",
            dock === "start" ? "end-0" : "start-0"
          )}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onKeyDown={handleKeyDown}
          onDoubleClick={() => commitWidth(layoutWidth)}
        />
      ) : null}
    </div>
  );
}

/** The stored width for a panel id's key, clamped, or `undefined` without one. */
function storedPanelWidth(
  key: string | undefined,
  bounds: ReturnType<typeof panelWidthBounds>
): number | undefined {
  if (key === undefined) return undefined;
  const stored = readStoredWidth(key);
  return stored === undefined ? undefined : clampPanelWidth(stored, bounds);
}

/** The width remembered for a panel, or `undefined` when none is stored. */
function readStoredWidth(key: string): number | undefined {
  try {
    if (typeof localStorage === "undefined") return undefined;
    const stored = localStorage.getItem(key);
    if (stored === null) return undefined;
    const parsed = Number(stored);
    return Number.isFinite(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}
