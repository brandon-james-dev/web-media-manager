import { COMMON_ATTRIBUTES } from "../commonAttributes";
import { NO_CHILDREN, THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import { ReferenceKind } from "../referenceKind";
import type { ElementDef } from "../types";
import { ValueType } from "../valueType";
import { WIDGET_ATTRIBUTES } from "../widgetAttributes";

/**
 * The play queue: current and upcoming songs. With `upNext`, an empty
 * queue with shuffle off shows the next song of the current collection
 * under `playback.upNext`. `presentation="popover"` is a button, styled by
 * `button`, that opens the queue in a host popover and is disabled while
 * the queue is empty. Without `artwork`, rows show track numbers. Minimum
 * inline 160×120, popover 28×28; one per page.
 *
 * @example
 * ```xml
 * <PlayQueue presentation="popover" artwork="true" clearButton="true" />
 * <PlayQueue
 *   column="1"
 *   artwork="true"
 *   clearButton="true"
 *   upNext="true"
 *   headerText="@text/pane-header"
 * />
 * ```
 * @example
 * ```ts
 * const queues = pageWidgets.filter((n) => n.name === "PlayQueue");
 * if (queues.length > (LAYOUT_ELEMENTS.PlayQueue.perPage ?? 1)) {
 *   reportSpecMismatch(queues[1]);
 * }
 * ```
 *
 * @see [ThemePlayQueue](../../../../components/theme-widgets/playback/PlayQueue.tsx)
 */
export const PLAY_QUEUE_ELEMENT: ElementDef = {
  name: "PlayQueue",
  category: ElementCategory.Widget,
  attributes: {
    ...COMMON_ATTRIBUTES,
    ...WIDGET_ATTRIBUTES,
    presentation: { type: ValueType.Enum, values: ["inline", "popover"] },
    artwork: { type: ValueType.Boolean },
    clearButton: { type: ValueType.Boolean },
    upNext: { type: ValueType.Boolean },
    rowText: { type: ValueType.Reference, refKinds: [ReferenceKind.Text] },
    detailText: { type: ValueType.Reference, refKinds: [ReferenceKind.Text] },
    headerText: { type: ValueType.Reference, refKinds: [ReferenceKind.Text] },
    button: { type: ValueType.Reference, refKinds: [ReferenceKind.Button] },
  },
  children: NO_CHILDREN,
  minSize: {
    inline: { width: 160, height: 120 },
    popover: { width: 28, height: 28 },
  },
  minSizeBy: "presentation",
  perPage: 1,
  since: THEME_SPEC_VERSION,
};
