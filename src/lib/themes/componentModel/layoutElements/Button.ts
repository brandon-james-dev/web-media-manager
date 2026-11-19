import { COMMON_ATTRIBUTES } from "../commonAttributes";
import { DISPLAY_VALUES, NO_CHILDREN, THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import { ReferenceKind } from "../referenceKind";
import type { ElementDef } from "../types";
import { ValueType } from "../valueType";

/**
 * Invokes a theme-invokable command (`E6050` otherwise). `commandParameter`
 * is required exactly when the command declares a literal parameter.
 * `labelKey` is the accessible name and, depending on `display`, the
 * visible label. `style` names a `@button/` style, and the inline
 * attributes override its properties but not its states.
 *
 * @example
 * ```xml
 * <Button command="wmm.ui.navigate" commandParameter="library"
 *         labelKey="navigation.library" icon="@icon/library" />
 * <Button command="wmm.playback.playpause" labelKey="playback.playPause"
 *         icon="@icon/playPause" style="@button/transport" display="icon" />
 * ```
 * @example
 * ```ts
 * if (!Object.hasOwn(WMM_THEME_COMMANDS, button.attributes.command)) {
 *   issues.push({ code: "E6050", attribute: "command" });
 * }
 * ```
 *
 * @see [ThemeButton](../../render/layout/browser/elements/ThemeButton.tsx)
 */
export const BUTTON_ELEMENT: ElementDef = {
  name: "Button",
  category: ElementCategory.Control,
  attributes: {
    ...COMMON_ATTRIBUTES,
    command: { type: ValueType.Command, required: true },
    commandParameter: { type: ValueType.String },
    labelKey: { type: ValueType.ResourceKey, required: true },
    tooltipKey: { type: ValueType.ResourceKey },
    icon: {
      type: ValueType.Reference,
      refKinds: [ReferenceKind.Icon, ReferenceKind.Image],
    },
    display: {
      type: ValueType.Enum,
      values: DISPLAY_VALUES,
      default: "iconAndLabel",
    },
    style: { type: ValueType.Reference, refKinds: [ReferenceKind.Button] },
    background: {
      type: ValueType.Brush,
      refKinds: [ReferenceKind.Brush, ReferenceKind.Slot, ReferenceKind.Color],
    },
    foreground: {
      type: ValueType.Color,
      refKinds: [ReferenceKind.Color, ReferenceKind.Slot],
    },
    border: {
      type: ValueType.Color,
      refKinds: [ReferenceKind.Color, ReferenceKind.Slot],
    },
    borderWidth: { type: ValueType.Thickness },
    cornerRadius: { type: ValueType.CornerRadius },
    padding: { type: ValueType.Thickness },
  },
  children: NO_CHILDREN,
  since: THEME_SPEC_VERSION,
};
