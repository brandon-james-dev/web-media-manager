import {
  DISPLAY_VALUES,
  ReferenceKind,
  ValueType,
  defineWidget,
} from "@/core/themes/widgetKit";

/**
 * Search input that filters the page's `TrackList` by title, album, artist
 * and genre. `sourceFilter` and `resultCount` are library-only (`E6206`).
 * `presentation="button"` shows an icon button that opens a full-width
 * overlay; `display` and `style` then work as on `Button`. Invalid in
 * `tv.xml` (`E6095`). Minimum 120×32, one per scope per page.
 *
 * @example
 * ```xml
 * <SearchBox
 *   scope="library"
 *   sourceFilter="true"
 *   resultCount="true"
 *   placeholderKey="search.placeholder"
 * />
 * <SearchBox
 *   presentation="button"
 *   display="iconAndLabel"
 *   style="@button/bottom-nav"
 * />
 * ```
 * @example
 * ```ts
 * const { scope = "library", sourceFilter, resultCount } = node.attributes;
 * if (scope === "sync" && (sourceFilter ?? resultCount) !== undefined) {
 *   issues.push({ code: "E6206", element: node.name });
 * }
 * ```
 *
 * @see [ThemeSearchBox](./SearchBox.tsx)
 */
export const SEARCH_BOX_ELEMENT = defineWidget({
  name: "SearchBox",
  attributes: {
    scope: {
      type: ValueType.Enum,
      values: ["library", "sync"],
      default: "library",
    },
    placeholderKey: { type: ValueType.ResourceKey },
    sourceFilter: { type: ValueType.Boolean },
    resultCount: { type: ValueType.Boolean },
    presentation: {
      type: ValueType.Enum,
      values: ["inline", "button"],
      default: "inline",
    },
    display: { type: ValueType.Enum, values: DISPLAY_VALUES },
    style: { type: ValueType.Reference, refKinds: [ReferenceKind.Button] },
  },
  minSize: { width: 120, height: 32 },
  perPage: 1,
});
