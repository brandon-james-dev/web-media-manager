import {
  ReferenceKind,
  ValueType,
  defineWidget,
} from "@/core/themes/widgetKit";

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
 * @see [ThemeSyncQueue](./SyncQueue.tsx)
 */
export const SYNC_QUEUE_ELEMENT = defineWidget({
  name: "SyncQueue",
  attributes: {
    summary: { type: ValueType.Boolean },
    rowText: { type: ValueType.Reference, refKinds: [ReferenceKind.Text] },
  },
  minSize: { width: 200, height: 120 },
  perPage: 1,
});
