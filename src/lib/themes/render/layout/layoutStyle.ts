import type { CSSProperties } from "react";
import type { IRGridTrack, IRNode, IRValue } from "../../ir";
import { attrBool, attrNumber, attrString, readAttr } from "./attributes";

/**
 * The cross-axis alignment keywords of `Stack align` and the common
 * `hAlign`/`vAlign` attributes, mapped to their flexbox values.
 *
 * @example
 * ```xml
 * <Stack orientation="horizontal" align="center" />
 * ```
 * @example
 * ```ts
 * ALIGN_ITEMS.center; // "center"
 * ```
 */
const ALIGN_ITEMS: Record<string, CSSProperties["alignItems"]> = {
  stretch: "stretch",
  start: "flex-start",
  center: "center",
  end: "flex-end",
};

/**
 * The main-axis keywords of `Stack justify`, mapped to their flexbox values.
 *
 * @example
 * ```xml
 * <Stack orientation="horizontal" justify="spaceBetween" />
 * ```
 * @example
 * ```ts
 * JUSTIFY_CONTENT.spaceBetween; // "space-between"
 * ```
 */
const JUSTIFY_CONTENT: Record<string, CSSProperties["justifyContent"]> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  spaceBetween: "space-between",
};

/**
 * The logical margin properties of a thickness, in top, right, bottom, left
 * order.
 *
 * @example
 * ```xml
 * <Panel margin="8 16" />
 * ```
 * @example
 * ```ts
 * MARGIN_PROPERTIES[0]; // "marginBlockStart"
 * ```
 */
const MARGIN_PROPERTIES = [
  "marginBlockStart",
  "marginInlineEnd",
  "marginBlockEnd",
  "marginInlineStart",
] as const;

/**
 * The single track a grid uses when it declares no rows or columns.
 *
 * @example
 * ```xml
 * <Grid columnGap="4" />
 * ```
 * @example
 * ```ts
 * DEFAULT_TRACK; // "minmax(0,1fr)"
 * ```
 */
const DEFAULT_TRACK = "minmax(0,1fr)";

/**
 * The placement a container hands a child that should take all of its space:
 * the default `stretch` behaviour of a Panel's child, the Shell root, a page
 * and the fill area of a DockPanel. Containers that use it lay out as a flex
 * column.
 *
 * @example
 * ```xml
 * <Panel style="@panel/chrome"><DockPanel /></Panel>
 * ```
 * @example
 * ```tsx
 * <RenderNode node={child} placement={FILL_PLACEMENT} />
 * ```
 */
export const FILL_PLACEMENT: CSSProperties = {
  flex: "1 1 auto",
  minWidth: 0,
  minHeight: 0,
};

/**
 * Whether the node renders at all. `visible="false"` removes it from the
 * tree, and so does a `libraryMode` other than the current one, so the
 * surrounding layout reflows as if the node were absent.
 *
 * @example
 * ```xml
 * <MetadataEditor dock="bottom" libraryMode="edit" mode="full" />
 * ```
 * @example
 * ```ts
 * isVisible(editor); // false
 * isVisible(editor, "edit"); // true
 * ```
 */
export function isVisible(
  node: IRNode,
  libraryMode: "playback" | "edit" = "playback"
): boolean {
  if (attrBool(node, "visible") === false) return false;
  const mode = attrString(node, "libraryMode");
  return mode === undefined || mode === libraryMode;
}

/**
 * The size and margin declarations every element accepts, as a plain style
 * object. `auto` stays `auto`; a length becomes pixels.
 *
 * @example
 * ```xml
 * <Panel width="220" minHeight="56" margin="8 16" />
 * ```
 * @example
 * ```ts
 * commonStyle(panel);
 * // { width: "220px", minHeight: "56px", marginBlockStart: "8px", ... }
 * ```
 */
export function commonStyle(node: IRNode): CSSProperties {
  const style: CSSProperties = {};
  assignLength(style, "width", readAttr(node, "width"));
  assignLength(style, "height", readAttr(node, "height"));
  assignLength(style, "minWidth", readAttr(node, "minWidth"));
  assignLength(style, "minHeight", readAttr(node, "minHeight"));
  assignLength(style, "maxWidth", readAttr(node, "maxWidth"));
  assignLength(style, "maxHeight", readAttr(node, "maxHeight"));

  const margin = thickness(readAttr(node, "margin"));
  if (margin !== undefined) {
    MARGIN_PROPERTIES.forEach((property, index) => {
      style[property] = pixels(margin[index]);
    });
  }
  return style;
}

/**
 * The flex container declarations of a `Stack`. Vertical is the default
 * orientation, `align` is the cross axis and `justify` the main axis.
 *
 * @example
 * ```xml
 * <Stack orientation="horizontal" gap="4" align="center" overflow="scroll" />
 * ```
 * @example
 * ```ts
 * stackStyle(stack);
 * // { display: "flex", flexDirection: "row", gap: "4px", alignItems: "center" }
 * ```
 */
export function stackStyle(node: IRNode): CSSProperties {
  const horizontal = attrString(node, "orientation") === "horizontal";
  const style: CSSProperties = {
    display: "flex",
    flexDirection: horizontal ? "row" : "column",
  };

  const gap = attrNumber(node, "gap");
  if (gap !== undefined) style.gap = pixels(gap);

  const align = ALIGN_ITEMS[attrString(node, "align") ?? ""];
  if (align !== undefined) style.alignItems = align;

  const justify = JUSTIFY_CONTENT[attrString(node, "justify") ?? ""];
  if (justify !== undefined) style.justifyContent = justify;

  const overflow = attrString(node, "overflow");
  if (overflow === "scroll") {
    if (horizontal) style.overflowX = "auto";
    else style.overflowY = "auto";
  } else if (overflow === "clip") {
    style.overflow = "hidden";
  }

  if (horizontal && attrBool(node, "wrap") === true) style.flexWrap = "wrap";

  return style;
}

/**
 * The flex item declarations of a `Stack` child. `grow` is a share of the
 * leftover space, so a zero or absent value leaves the child at its natural
 * size. The cross-axis alignment attribute, `hAlign` in a vertical stack and
 * `vAlign` in a horizontal one, overrides the stack's `align` for that child;
 * the default `stretch` leaves the stack's `align` in charge.
 *
 * @example
 * ```xml
 * <Stack orientation="horizontal"><SearchBox grow="1" /></Stack>
 * <Stack><Artwork width="160" height="160" hAlign="center" /></Stack>
 * ```
 * @example
 * ```ts
 * stackItemStyle(searchBox, true); // { flex: "1 1 0", minWidth: 0, minHeight: 0 }
 * stackItemStyle(artwork, false); // { alignSelf: "center", maxWidth: "100%" }
 * ```
 */
export function stackItemStyle(
  node: IRNode,
  horizontal = false
): CSSProperties {
  const style: CSSProperties = {};
  const grow = attrNumber(node, "grow") ?? 0;
  if (grow > 0) {
    style.flex = `${grow} 1 0`;
    style.minWidth = 0;
    style.minHeight = 0;
  }
  const keyword = attrString(node, horizontal ? "vAlign" : "hAlign");
  const align = keyword === "stretch" ? undefined : ALIGN_ITEMS[keyword ?? ""];
  if (align !== undefined) {
    style.alignSelf = align;
    if (horizontal) style.maxHeight = "100%";
    else style.maxWidth = "100%";
  }
  return style;
}

/**
 * The grid container declarations of a `Grid`. A pixel track becomes `Npx`,
 * a star track `minmax(0,Nfr)` and an `auto` track stays content-sized.
 *
 * @example
 * ```xml
 * <Grid columns="220 1* 2*" rows="auto 1*" columnGap="4" rowGap="4" />
 * ```
 * @example
 * ```ts
 * gridStyle(grid).gridTemplateColumns; // "220px minmax(0,1fr) minmax(0,2fr)"
 * ```
 */
export function gridStyle(node: IRNode): CSSProperties {
  const style: CSSProperties = {
    display: "grid",
    gridTemplateColumns: trackList(readAttr(node, "columns")).join(" "),
    gridTemplateRows: trackList(readAttr(node, "rows")).join(" "),
  };

  const columnGap = attrNumber(node, "columnGap");
  if (columnGap !== undefined) style.columnGap = pixels(columnGap);

  const rowGap = attrNumber(node, "rowGap");
  if (rowGap !== undefined) style.rowGap = pixels(rowGap);

  return style;
}

/**
 * The grid cell declarations of a `Grid` child. `row` and `column` are
 * zero-based and default to 0, and both spans default to 1.
 *
 * @example
 * ```xml
 * <Grid columns="220 1*" rows="1* 200">
 *   <LibraryBrowser row="0" column="0" rowSpan="2" />
 * </Grid>
 * ```
 * @example
 * ```ts
 * gridItemStyle(browser); // { gridRow: "1 / span 2", gridColumn: "1 / span 1" }
 * ```
 */
export function gridItemStyle(node: IRNode): CSSProperties {
  const row = attrNumber(node, "row") ?? 0;
  const column = attrNumber(node, "column") ?? 0;
  const rowSpan = attrNumber(node, "rowSpan") ?? 1;
  const columnSpan = attrNumber(node, "columnSpan") ?? 1;
  const style: CSSProperties = {
    gridRow: `${row + 1} / span ${rowSpan}`,
    gridColumn: `${column + 1} / span ${columnSpan}`,
    minWidth: 0,
    minHeight: 0,
  };
  const justify = ALIGN_ITEMS[attrString(node, "hAlign") ?? ""];
  if (justify !== undefined) style.justifySelf = justify;
  const align = ALIGN_ITEMS[attrString(node, "vAlign") ?? ""];
  if (align !== undefined) style.alignSelf = align;
  return style;
}

/** Writes a length declaration when the value carries one. */
function assignLength(
  style: CSSProperties,
  property:
    "width" | "height" | "minWidth" | "minHeight" | "maxWidth" | "maxHeight",
  value: IRValue | undefined
): void {
  if (typeof value === "number") style[property] = pixels(value);
}

/** A pixel length as a CSS string. */
function pixels(value: number): string {
  return `${value}px`;
}

/** The four numbers of a thickness, or `undefined` for any other value. */
function thickness(value: IRValue | undefined): number[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const numbers = value.filter(
    (entry): entry is number => typeof entry === "number"
  );
  return numbers.length === value.length ? numbers : undefined;
}

/** The CSS track list of a `Grid` axis. */
function trackList(value: IRValue | undefined): string[] {
  if (!Array.isArray(value)) return [DEFAULT_TRACK];
  const tracks = value.filter(isGridTrack);
  if (tracks.length === 0) return [DEFAULT_TRACK];
  return tracks.map(trackValue);
}

/** The CSS value of one grid track. */
function trackValue(track: IRGridTrack): string {
  switch (track.type) {
    case "px":
      return pixels(track.value);
    case "star":
      return `minmax(0,${track.share}fr)`;
    case "auto":
      return "auto";
  }
}

/** Whether a compiled value is one grid track. */
function isGridTrack(value: unknown): value is IRGridTrack {
  if (typeof value !== "object" || value === null) return false;
  if (!("type" in value)) return false;
  const type = (value as { type: unknown }).type;
  return type === "px" || type === "star" || type === "auto";
}
