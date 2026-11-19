import {
  COMMON_ATTRIBUTES,
  ElementCategory,
  NO_CHILDREN,
  ReferenceKind,
  THEME_SPEC_VERSION,
  ValueType,
  WIDGET_ATTRIBUTES,
} from "@/lib/themes/widgetKit";
import type { ElementDef } from "@/lib/themes/widgetKit";

/**
 * Summary of the page's `TrackList` collection: a mosaic of the first four
 * album covers, the page's `titleKey`, and "N songs · M min". Needs a
 * `TrackList` on the same page (`E6205`). Minimum 160×40, one per page.
 *
 * @example
 * ```xml
 * <CollectionSummary
 *   fields="artwork title count duration"
 *   titleText="@text/tv-title"
 *   detailText="@text/tv-detail"
 * />
 * ```
 * @example
 * ```ts
 * const hasTrackList = pageWidgets.some((n) => n.name === "TrackList");
 * if (node.name === "CollectionSummary" && !hasTrackList) {
 *   issues.push({ code: "E6205", element: node.name });
 * }
 * ```
 *
 * @see [ThemeCollectionSummary](./CollectionSummary.tsx)
 */
export const COLLECTION_SUMMARY_ELEMENT: ElementDef = {
  name: "CollectionSummary",
  category: ElementCategory.Widget,
  attributes: {
    ...COMMON_ATTRIBUTES,
    ...WIDGET_ATTRIBUTES,
    fields: {
      type: ValueType.EnumList,
      values: ["artwork", "title", "count", "duration"],
    },
    titleText: { type: ValueType.Reference, refKinds: [ReferenceKind.Text] },
    detailText: { type: ValueType.Reference, refKinds: [ReferenceKind.Text] },
  },
  children: NO_CHILDREN,
  minSize: { width: 160, height: 40 },
  perPage: 1,
  since: THEME_SPEC_VERSION,
};
