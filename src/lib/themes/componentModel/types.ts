import type { THEME_SPEC_VERSION } from "./constants";
import type { ElementCategory } from "./elementCategory";
import type { ReferenceKind } from "./referenceKind";
import type { ValueType } from "./valueType";

/**
 * A width and height in CSS pixels. Used for widget minimum sizes. A fixed
 * `width` or `height` below the minimum is a warning (`W6071`), and the host
 * enforces the minimum at render time.
 *
 * @example
 * ```xml
 * <LibraryBrowser dock="start" width="240" />
 * ```
 * @example
 * ```ts
 * const minSize: Size = { width: 160, height: 160 };
 * ```
 */
export interface Size {
  /** Width in CSS pixels. */
  readonly width: number;
  /** Height in CSS pixels. */
  readonly height: number;
}

/**
 * The typed contract for one XML attribute. The validator checks the value
 * against `type` and the optional constraints. Unknown attributes are errors.
 *
 * @example
 * ```xml
 * <Stack orientation="horizontal" />
 * ```
 * @example
 * ```ts
 * const orientation: AttributeDef = {
 *   type: ValueType.Enum,
 *   values: ["horizontal", "vertical"],
 *   default: "vertical",
 * };
 * ```
 */
export interface AttributeDef {
  /**
   * The value grammar the attribute uses.
   *
   * @example
   * ```ts
   * const padding: AttributeDef = { type: ValueType.Thickness };
   * ```
   */
  readonly type: ValueType;
  /**
   * Whether the attribute must be present.
   *
   * @example
   * ```xml
   * <Button command="wmm.playback.next" labelKey="playback.next" />
   * ```
   * @example
   * ```ts
   * const command: AttributeDef = { type: ValueType.Command, required: true };
   * ```
   */
  readonly required?: boolean;
  /**
   * The allowed keywords for `Enum` and `EnumList` attributes.
   *
   * @example
   * ```xml
   * <SearchBox scope="sync" />
   * ```
   * @example
   * ```ts
   * const scope: AttributeDef = {
   *   type: ValueType.Enum,
   *   values: ["library", "sync"],
   *   default: "library",
   * };
   * ```
   */
  readonly values?: readonly string[];
  /**
   * The reference kinds a `Reference` attribute accepts.
   *
   * @example
   * ```xml
   * <Panel shadow="@shadow/raised" />
   * ```
   * @example
   * ```ts
   * const shadow: AttributeDef = {
   *   type: ValueType.Reference,
   *   refKinds: [ReferenceKind.Shadow],
   * };
   * ```
   */
  readonly refKinds?: readonly ReferenceKind[];
  /**
   * The smallest allowed number, inclusive.
   *
   * @example
   * ```ts
   * const rowSpan: AttributeDef = { type: ValueType.Integer, min: 1 };
   * ```
   */
  readonly min?: number;
  /**
   * The largest allowed number, inclusive.
   *
   * @example
   * ```ts
   * const grow: AttributeDef = { type: ValueType.Integer, min: 0, max: 100 };
   * ```
   */
  readonly max?: number;
  /**
   * The longest allowed string, in characters.
   *
   * @example
   * ```xml
   * <Text literal="WMM" />
   * ```
   * @example
   * ```ts
   * const literal: AttributeDef = { type: ValueType.String, maxLength: 32 };
   * ```
   */
  readonly maxLength?: number;
  /**
   * The value the host uses when the attribute is absent, written as it
   * would appear in XML.
   *
   * @example
   * ```ts
   * const collapsible: AttributeDef = {
   *   type: ValueType.Boolean,
   *   default: "false",
   * };
   * ```
   */
  readonly default?: string;
  /**
   * The parent element the attribute belongs to. On any other parent it is
   * an error (`E6030`).
   *
   * @example
   * ```xml
   * <Grid columns="240 1*" rows="1*">
   *   <LibraryBrowser column="0" />
   *   <TrackList column="1" variant="table" />
   * </Grid>
   * ```
   * @example
   * ```ts
   * const column: AttributeDef = {
   *   type: ValueType.Integer,
   *   min: 0,
   *   default: "0",
   *   parent: "Grid",
   * };
   * ```
   */
  readonly parent?: string;
  /**
   * The element variants the attribute applies to. On any other variant it
   * is an error (`E6202`).
   *
   * @example
   * ```xml
   * <TrackList variant="table" sortBy="artist" sortDirection="descending" />
   * ```
   * @example
   * ```ts
   * const showHeader: AttributeDef = {
   *   type: ValueType.Boolean,
   *   default: "true",
   *   variants: ["table"],
   * };
   * ```
   */
  readonly variants?: readonly string[];
}

/**
 * How many children an element takes and which ones.
 *
 * @example
 * ```xml
 * <Tabs>
 *   <Tab id="songs" titleKey="library.songs">
 *     <TrackList variant="table" />
 *   </Tab>
 *   <Tab id="albums" titleKey="library.albums">
 *     <LibraryBrowser views="albums" />
 *   </Tab>
 * </Tabs>
 * ```
 * @example
 * ```ts
 * const tabsChildren: ChildRule = {
 *   min: 2,
 *   max: 9,
 *   allowed: ["Tab", "TabStripEnd"],
 * };
 * ```
 */
export interface ChildRule {
  /**
   * The fewest children allowed.
   *
   * @example
   * ```ts
   * const ok = children.length >= rule.min;
   * ```
   */
  readonly min: number;
  /**
   * The most children allowed, or `null` for no limit.
   *
   * @example
   * ```ts
   * const ok = rule.max === null || children.length <= rule.max;
   * ```
   */
  readonly max: number | null;
  /**
   * The element names allowed as children, or `"layout"` for any element
   * that may appear inside a layout tree.
   *
   * @example
   * ```ts
   * const ok =
   *   rule.allowed === "layout"
   *     ? isLayoutElement(child.name)
   *     : rule.allowed.includes(child.name);
   * ```
   */
  readonly allowed: readonly string[] | "layout";
}

/**
 * The definition of one layout XML element: its attributes, children,
 * placement and size rules. {@link LAYOUT_ELEMENTS} holds one per element.
 *
 * @example
 * ```xml
 * <MetadataEditor dock="bottom" libraryMode="edit" mode="full" height="320" />
 * ```
 * @example
 * ```ts
 * const def = getElementDef("MetadataEditor");
 * if (def?.category === ElementCategory.Widget) {
 *   validateWidget(element, def);
 * }
 * ```
 */
export interface ElementDef {
  /**
   * The XML element name, matching its key in {@link LAYOUT_ELEMENTS}.
   *
   * @example
   * ```ts
   * const name: ElementDef["name"] = "TrackList";
   * ```
   */
  readonly name: string;
  /**
   * The element's category.
   *
   * @example
   * ```ts
   * const category: ElementDef["category"] = ElementCategory.Primitive;
   * ```
   */
  readonly category: ElementCategory;
  /**
   * Every attribute the element accepts, keyed by name.
   *
   * @example
   * ```ts
   * const known = attributeName in def.attributes;
   * ```
   */
  readonly attributes: Readonly<Record<string, AttributeDef>>;
  /**
   * The element's child rule. Widgets take no children (`E6070`).
   *
   * @example
   * ```ts
   * const children: ElementDef["children"] = NO_CHILDREN;
   * ```
   */
  readonly children: ChildRule;
  /**
   * The only parents the element may appear under. Absent means any parent
   * whose child rule allows it.
   *
   * @example
   * ```xml
   * <Tab id="songs" titleKey="library.songs">
   *   <TrackList variant="table" />
   * </Tab>
   * ```
   * @example
   * ```ts
   * const parents: ElementDef["parents"] = ["Tabs"];
   * ```
   */
  readonly parents?: readonly string[];
  /**
   * The widget's minimum size. Either one {@link Size}, or one per value of
   * the attribute named by `minSizeBy`.
   *
   * @example
   * ```ts
   * const minSize: ElementDef["minSize"] = {
   *   bar: { width: 80, height: 16 },
   *   edge: { width: 80, height: 2 },
   * };
   * ```
   */
  readonly minSize?: Size | Readonly<Record<string, Size>>;
  /**
   * The attribute whose value picks the entry in `minSize`.
   *
   * @example
   * ```xml
   * <VolumeControl orientation="vertical" />
   * ```
   * @example
   * ```ts
   * const minSizeBy: ElementDef["minSizeBy"] = "orientation";
   * ```
   */
  readonly minSizeBy?: string;
  /**
   * How many times the element may appear on one page, or `null` for no
   * limit. The Shell counts as a page, and a widget in the Shell counts
   * against every page.
   *
   * @example
   * ```ts
   * const perPage: ElementDef["perPage"] = 1;
   * ```
   */
  readonly perPage?: number | null;
  /**
   * How many times the element may appear in the whole layout file.
   *
   * @example
   * ```ts
   * const perLayout: ElementDef["perLayout"] = 1;
   * ```
   */
  readonly perLayout?: number;
  /**
   * The spec version that introduced the element.
   *
   * @example
   * ```ts
   * const since: ElementDef["since"] = THEME_SPEC_VERSION;
   * ```
   */
  readonly since: typeof THEME_SPEC_VERSION;
}
