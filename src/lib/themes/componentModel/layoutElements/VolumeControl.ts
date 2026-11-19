import { COMMON_ATTRIBUTES } from "../commonAttributes";
import { NO_CHILDREN, THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import { ReferenceKind } from "../referenceKind";
import type { ElementDef } from "../types";
import { ValueType } from "../valueType";
import { WIDGET_ATTRIBUTES } from "../widgetAttributes";

/**
 * App-wide volume slider, 0–1 in 0.01 steps, with an optional mute
 * button styled by `button`. Warns in `tv.xml`, where the remote controls
 * volume (`W6108`). Minimum horizontal 80×16, vertical 16×80; two per
 * page.
 *
 * @example
 * ```xml
 * <VolumeControl width="140" muteButton="true" slider="@slider/volume" />
 * <VolumeControl
 *   orientation="vertical"
 *   height="120"
 *   button="@button/icon"
 * />
 * ```
 * @example
 * ```ts
 * if (formFactor === FormFactor.Tv && node.name === "VolumeControl") {
 *   issues.push({ code: "W6108", element: node.name });
 * }
 * ```
 *
 * @see [ThemeVolumeControl](../../../../components/theme-widgets/playback/VolumeControl.tsx)
 */
export const VOLUME_CONTROL_ELEMENT: ElementDef = {
  name: "VolumeControl",
  category: ElementCategory.Widget,
  attributes: {
    ...COMMON_ATTRIBUTES,
    ...WIDGET_ATTRIBUTES,
    orientation: {
      type: ValueType.Enum,
      values: ["horizontal", "vertical"],
    },
    muteButton: { type: ValueType.Boolean },
    slider: { type: ValueType.Reference, refKinds: [ReferenceKind.Slider] },
    button: { type: ValueType.Reference, refKinds: [ReferenceKind.Button] },
  },
  children: NO_CHILDREN,
  minSize: {
    horizontal: { width: 80, height: 16 },
    vertical: { width: 16, height: 80 },
  },
  minSizeBy: "orientation",
  perPage: 2,
  since: THEME_SPEC_VERSION,
};
