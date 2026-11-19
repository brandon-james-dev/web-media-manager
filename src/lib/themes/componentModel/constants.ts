import type { ChildRule } from "./types";

/**
 * XML namespace every theme layout document must declare on its root.
 *
 * @example
 * ```xml
 * <Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="desktop">
 * ```
 * @example
 * ```ts
 * if (root.uri !== THEME_NAMESPACE) reportWrongNamespace(root);
 * ```
 */
export const THEME_NAMESPACE = "urn:wmm:theme:1";

/**
 * Spec version this host implements. Compared with the `spec` attribute of
 * a layout and with the manifest, and stamped as `since` on every element.
 *
 * @example
 * ```ts
 * if (root.attributes.spec !== THEME_SPEC_VERSION) reportSpecMismatch(root);
 * ```
 * @example
 * ```ts
 * const Shell: ElementDef = { ...shell, since: THEME_SPEC_VERSION };
 * ```
 */
export const THEME_SPEC_VERSION = "1.0";

/**
 * Allowed values for alignment attributes such as `hAlign`, `vAlign` and
 * `Stack` `align`.
 *
 * @example
 * ```xml
 * <Stack orientation="horizontal" align="center">
 * ```
 * @example
 * ```ts
 * hAlign: { type: ValueType.Enum, values: ALIGN_VALUES, default: "stretch" }
 * ```
 */
export const ALIGN_VALUES = ["stretch", "start", "center", "end"] as const;

/**
 * Allowed values for the `display` attribute of `Button`, `Tabs` and
 * `SearchBox`, choosing whether the icon, the label or both are shown.
 *
 * @example
 * ```xml
 * <Button command="wmm.playback.playpause" labelKey="playback.playPause"
 *   icon="@icon/play" display="icon" />
 * ```
 * @example
 * ```ts
 * display: { type: ValueType.Enum, values: DISPLAY_VALUES }
 * ```
 */
export const DISPLAY_VALUES = ["icon", "label", "iconAndLabel"] as const;

/**
 * Child rule for elements that must be empty, such as widgets, `Text`,
 * `Image`, `Button` and `PageHost`.
 *
 * @example
 * ```xml
 * <SeekBar />
 * ```
 * @example
 * ```ts
 * SeekBar: { ...seekBar, children: NO_CHILDREN }
 * ```
 */
export const NO_CHILDREN: ChildRule = { min: 0, max: 0, allowed: [] };

/**
 * Child rule for containers that wrap exactly one layout element, such as
 * `Shell`, `Page`, `Tab` and `TabStripEnd`.
 *
 * @example
 * ```xml
 * <Page id="songs" role="library">
 *   <DockPanel>...</DockPanel>
 * </Page>
 * ```
 * @example
 * ```ts
 * Page: { ...page, children: SINGLE_LAYOUT }
 * ```
 */
export const SINGLE_LAYOUT: ChildRule = { min: 1, max: 1, allowed: "layout" };

/**
 * Child rule for containers that may wrap at most one layout element, such
 * as `Panel`.
 *
 * @example
 * ```xml
 * <Panel id="queue" collapsible="true">
 *   <PlayQueue />
 * </Panel>
 * ```
 * @example
 * ```ts
 * Panel: { ...panel, children: OPTIONAL_LAYOUT }
 * ```
 */
export const OPTIONAL_LAYOUT: ChildRule = { min: 0, max: 1, allowed: "layout" };

/**
 * Child rule for primitives that arrange any number of layout elements, such
 * as `Stack`, `Grid` and `DockPanel`.
 *
 * @example
 * ```xml
 * <Stack orientation="horizontal" gap="8">
 *   <Button command="wmm.playback.prev" labelKey="playback.previous" />
 *   <Button command="wmm.playback.next" labelKey="playback.next" />
 * </Stack>
 * ```
 * @example
 * ```ts
 * Stack: { ...stack, children: LAYOUT_LIST }
 * ```
 */
export const LAYOUT_LIST: ChildRule = { min: 0, max: null, allowed: "layout" };
