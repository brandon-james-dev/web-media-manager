import { ALIGN_VALUES } from "./constants";
import { LibraryMode } from "./libraryMode";
import type { AttributeDef } from "./types";
import { ValueType } from "./valueType";

/**
 * The layout attributes every primitive, control and widget accepts, merged
 * into each element's own attributes. Entries with a `parent` are only valid
 * on direct children of that element (`dock` under `DockPanel`; `row`,
 * `column`, `rowSpan`, `columnSpan` under `Grid`; `grow` under `Stack`);
 * anywhere else they are `E6030`. `libraryMode` is limited to the Shell and
 * library-family pages (`E6201`), and `idleHide` to the `nowPlaying` page
 * (`E6101`).
 *
 * @example
 * ```xml
 * <DockPanel>
 *   <Grid dock="top" columns="auto 1* auto" columnGap="12" margin="8 16" />
 *   <MetadataEditor dock="bottom" libraryMode="edit" mode="full" height="320" panel="@panel/editor" />
 * </DockPanel>
 * ```
 * @example
 * ```ts
 * const def = COMMON_ATTRIBUTES[name];
 * if ("parent" in def && def.parent !== parentElement.name) {
 *   issues.push({ code: "E6030", attribute: name });
 * }
 * ```
 */
export const COMMON_ATTRIBUTES = {
  id: { type: ValueType.Id },
  libraryMode: {
    type: ValueType.Enum,
    values: [LibraryMode.Playback, LibraryMode.Edit],
  },
  idleHide: { type: ValueType.Boolean },
  width: { type: ValueType.LengthOrAuto, default: "auto" },
  height: { type: ValueType.LengthOrAuto, default: "auto" },
  minWidth: { type: ValueType.Length },
  minHeight: { type: ValueType.Length },
  maxWidth: { type: ValueType.Length },
  maxHeight: { type: ValueType.Length },
  margin: { type: ValueType.Thickness },
  hAlign: { type: ValueType.Enum, values: ALIGN_VALUES, default: "stretch" },
  vAlign: { type: ValueType.Enum, values: ALIGN_VALUES, default: "stretch" },
  dock: {
    type: ValueType.Enum,
    values: ["top", "bottom", "start", "end", "fill"],
    parent: "DockPanel",
  },
  row: { type: ValueType.Integer, min: 0, default: "0", parent: "Grid" },
  column: { type: ValueType.Integer, min: 0, default: "0", parent: "Grid" },
  rowSpan: { type: ValueType.Integer, min: 1, default: "1", parent: "Grid" },
  columnSpan: { type: ValueType.Integer, min: 1, default: "1", parent: "Grid" },
  grow: { type: ValueType.Integer, min: 0, max: 100, parent: "Stack" },
} as const satisfies Readonly<Record<string, AttributeDef>>;
