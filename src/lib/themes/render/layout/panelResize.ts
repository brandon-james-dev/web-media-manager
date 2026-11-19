import type { FormFactor } from "../../componentModel";
import type { IRNode } from "../../ir";
import { attrNumber } from "./attributes";

/**
 * The narrowest width a resizable panel shrinks to when it declares no
 * `minWidth`.
 *
 * @example
 * ```xml
 * <Panel id="library-nav" dock="start" resizable="true" />
 * ```
 * @example
 * ```ts
 * PANEL_MIN_WIDTH; // 120
 * ```
 */
export const PANEL_MIN_WIDTH = 120;

/**
 * The widest width a resizable panel grows to when it declares no
 * `maxWidth`.
 *
 * @example
 * ```xml
 * <Panel id="library-nav" dock="start" resizable="true" />
 * ```
 * @example
 * ```ts
 * PANEL_MAX_WIDTH; // 600
 * ```
 */
export const PANEL_MAX_WIDTH = 600;

/**
 * How far one arrow key moves a resizable panel's edge.
 *
 * @example
 * ```xml
 * <Panel id="library-nav" dock="start" resizable="true" />
 * ```
 * @example
 * ```ts
 * PANEL_RESIZE_STEP; // 16
 * ```
 */
export const PANEL_RESIZE_STEP = 16;

/**
 * The width range a resizable panel may take: its own `minWidth` and
 * `maxWidth` when it declares them, otherwise {@link PANEL_MIN_WIDTH} to
 * {@link PANEL_MAX_WIDTH}. A range that would be inverted collapses to its
 * lower bound.
 *
 * @example
 * ```xml
 * <Panel id="library-nav" dock="start" resizable="true" minWidth="140" maxWidth="420" />
 * ```
 * @example
 * ```ts
 * panelWidthBounds(panel); // { min: 140, max: 420 }
 * ```
 */
export function panelWidthBounds(node: IRNode): {
  readonly min: number;
  readonly max: number;
} {
  const min = attrNumber(node, "minWidth") ?? PANEL_MIN_WIDTH;
  const max = attrNumber(node, "maxWidth") ?? PANEL_MAX_WIDTH;
  return { min, max: Math.max(min, max) };
}

/**
 * Holds a panel width inside its bounds, so a drag past an edge stops there
 * instead of shrinking the panel out of view.
 *
 * @example
 * ```xml
 * <Panel id="library-nav" dock="start" resizable="true" minWidth="140" maxWidth="420" />
 * ```
 * @example
 * ```ts
 * clampPanelWidth(900, { min: 140, max: 420 }); // 420
 * ```
 */
export function clampPanelWidth(
  width: number,
  bounds: { readonly min: number; readonly max: number }
): number {
  return Math.min(bounds.max, Math.max(bounds.min, Math.round(width)));
}

/**
 * Where a panel width is remembered: per theme, form factor and panel id.
 *
 * @example
 * ```xml
 * <Panel id="library-nav" dock="start" resizable="true" />
 * ```
 * @example
 * ```ts
 * panelWidthKey("glass-player", "desktop", "library-nav");
 * // "wmm.theme.panel.glass-player.desktop.library-nav"
 * ```
 */
export function panelWidthKey(
  themeId: string,
  formFactor: FormFactor,
  id: string
): string {
  return `wmm.theme.panel.${themeId}.${formFactor}.${id}`;
}

/**
 * How far an arrow key moves the panel edge. The handle sits on the inner
 * edge, so a `start` panel grows to the right and an `end` panel grows to the
 * left.
 *
 * @example
 * ```xml
 * <Panel id="library-nav" dock="start" resizable="true" />
 * ```
 * @example
 * ```ts
 * panelResizeStep("start", "ArrowRight"); // 16
 * panelResizeStep("end", "ArrowRight"); // -16
 * ```
 */
export function panelResizeStep(
  dock: "start" | "end",
  key: "ArrowLeft" | "ArrowRight"
): number {
  const outward = dock === "start" ? "ArrowRight" : "ArrowLeft";
  return key === outward ? PANEL_RESIZE_STEP : -PANEL_RESIZE_STEP;
}
