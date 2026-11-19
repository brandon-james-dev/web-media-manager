import { COMMON_ATTRIBUTES } from "../commonAttributes";
import { NO_CHILDREN, THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import { ReferenceKind } from "../referenceKind";
import type { ElementDef } from "../types";
import { ValueType } from "../valueType";
import { WIDGET_ATTRIBUTES } from "../widgetAttributes";

/**
 * Songs queued for device sync. `summary` adds the totals line. Rows from
 * a `TrackList` can be dragged onto it. Minimum 200×120, one per page.
 *
 * @example
 * ```xml
 * <Tab id="sync" titleKey="navigation.sync" icon="@icon/sync">
 *   <SyncQueue summary="true" rowText="@text/body" />
 * </Tab>
 * ```
 * @example
 * ```ts
 * if (node.name === "SyncQueue" && node.children.length > 0) {
 *   issues.push({ code: "E6070", element: node.name });
 * }
 * ```
 *
 * @see [ThemeSyncQueue](../../../../components/theme-widgets/library/SyncQueue.tsx)
 */
export const SYNC_QUEUE_ELEMENT: ElementDef = {
  name: "SyncQueue",
  category: ElementCategory.Widget,
  attributes: {
    ...COMMON_ATTRIBUTES,
    ...WIDGET_ATTRIBUTES,
    summary: { type: ValueType.Boolean },
    rowText: { type: ValueType.Reference, refKinds: [ReferenceKind.Text] },
  },
  children: NO_CHILDREN,
  minSize: { width: 200, height: 120 },
  perPage: 1,
  since: THEME_SPEC_VERSION,
};
