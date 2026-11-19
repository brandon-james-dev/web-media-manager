import {
  ReferenceKind,
  ValueType,
  defineWidget,
} from "@/core/themes/widgetKit";

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
 * @see [ThemeVolumeControl](./VolumeControl.tsx)
 */
export const VOLUME_CONTROL_ELEMENT = defineWidget({
  name: "VolumeControl",
  attributes: {
    orientation: {
      type: ValueType.Enum,
      values: ["horizontal", "vertical"],
    },
    muteButton: { type: ValueType.Boolean },
    slider: { type: ValueType.Reference, refKinds: [ReferenceKind.Slider] },
    button: { type: ValueType.Reference, refKinds: [ReferenceKind.Button] },
  },
  minSize: {
    horizontal: { width: 80, height: 16 },
    vertical: { width: 16, height: 80 },
  },
  minSizeBy: "orientation",
  perPage: 2,
});
