import { COMMON_ATTRIBUTES } from "../commonAttributes";
import { DISPLAY_VALUES, THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import { ReferenceKind } from "../referenceKind";
import type { ElementDef } from "../types";
import { ValueType } from "../valueType";

/**
 * Switches between 2–8 `Tab` panels (`E6106`), with an optional
 * `TabStripEnd` drawn at the end of the strip. `tabStyle` names a
 * `@button/` style, and the host applies `selected` to the current tab.
 * Hidden panels stay unmounted, except a `Visualizer`, which is paused.
 * The strip's start holds the controls the selected tab's widget places
 * there, such as a `Visualizer`'s picker and settings. A `hideInFullscreen`
 * strip steps aside in full screen while the selected tab's content stays,
 * and a `TabStripEnd` stays visible while the tabs step aside.
 *
 * @example
 * ```xml
 * <Tabs strip="top" stripAlign="center" tabStyle="@button/tab">
 *   <Tab id="queue" titleKey="playback.queue" icon="@icon/queue">
 *     <PlayQueue />
 *   </Tab>
 *   <Tab id="lyrics" titleKey="playback.lyrics" icon="@icon/lyrics">
 *     <Lyrics />
 *   </Tab>
 * </Tabs>
 * ```
 * @example
 * ```ts
 * const tabs = node.children.filter((child) => child.name === "Tab");
 * if (tabs.length < 2 || tabs.length > 8) {
 *   issues.push({ code: "E6106", element: "Tabs" });
 * }
 * ```
 *
 * @see [Tabs](../../render/layout/browser/elements/Tabs.tsx)
 */
export const TABS_ELEMENT: ElementDef = {
  name: "Tabs",
  category: ElementCategory.Primitive,
  attributes: {
    ...COMMON_ATTRIBUTES,
    strip: {
      type: ValueType.Enum,
      values: ["top", "bottom", "start", "end"],
    },
    stripAlign: { type: ValueType.Enum, values: ["start", "center", "end"] },
    tabStyle: { type: ValueType.Reference, refKinds: [ReferenceKind.Button] },
    display: {
      type: ValueType.Enum,
      values: DISPLAY_VALUES,
      default: "iconAndLabel",
    },
    /**
     * Whether the tab strip is left out while the document is in full
     * screen, so the selected tab's content keeps the whole window.
     */
    hideInFullscreen: { type: ValueType.Boolean, default: "false" },
  },
  children: { min: 2, max: 9, allowed: ["Tab", "TabStripEnd"] },
  since: THEME_SPEC_VERSION,
};
