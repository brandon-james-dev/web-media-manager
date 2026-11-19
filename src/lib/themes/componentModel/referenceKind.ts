/**
 * The `kind` part of an `@kind/id` reference. Each kind names the
 * `theme.xml` section the id is declared in, except `icon`, which names a
 * closed, host-owned list.
 *
 * @example
 * ```xml
 * <Button icon="@icon/play" style="@button/transport" />
 * ```
 * @example
 * ```ts
 * style: { type: ValueType.Reference, refKinds: [ReferenceKind.Button] }
 * ```
 */
export const ReferenceKind = {
  /**
   * Fixed color declared in `<Colors>`.
   *
   * @example
   * ```xml
   * <Set slot="background" value="@color/navy-900" />
   * ```
   */
  Color: "color",
  /**
   * Scheme-dependent color slot declared in `<Palettes>`. Follows light and
   * dark mode and the user's accent.
   *
   * @example
   * ```xml
   * <PanelStyle id="inset" background="@slot/card" border="@slot/border" />
   * ```
   */
  Slot: "slot",
  /**
   * Length declared in `<Metrics>`.
   *
   * @example
   * ```xml
   * <Stack gap="@length/gap-md" />
   * ```
   */
  Length: "length",
  /**
   * Font family declared in `<Fonts>`.
   *
   * @example
   * ```xml
   * <TextStyle id="body" font="@font/ui" size="13" />
   * ```
   */
  Font: "font",
  /**
   * Text style declared in `<TextStyles>`.
   *
   * @example
   * ```xml
   * <TextStyle id="caption" basedOn="@text/body" size="11" />
   * ```
   */
  Text: "text",
  /**
   * Image asset declared in `<Images>`.
   *
   * @example
   * ```xml
   * <ImageBrush id="frame" image="@image/chrome-frame" fit="nineSlice" />
   * ```
   */
  Image: "image",
  /**
   * Brush declared in `<Brushes>`.
   *
   * @example
   * ```xml
   * <State name="pressed" background="@brush/chrome-gloss-down" />
   * ```
   */
  Brush: "brush",
  /**
   * Shadow declared in `<Shadows>`.
   *
   * @example
   * ```xml
   * <State name="pressed" shadow="@shadow/inset" />
   * ```
   */
  Shadow: "shadow",
  /**
   * Button style declared in `<ButtonStyles>`.
   *
   * @example
   * ```xml
   * <Defaults button="@button/standard" />
   * ```
   */
  Button: "button",
  /**
   * Slider style declared in `<SliderStyles>`, shared by seek and volume.
   *
   * @example
   * ```xml
   * <SeekBar grow="1" slider="@slider/seek" />
   * ```
   */
  Slider: "slider",
  /**
   * Panel style declared in `<PanelStyles>`.
   *
   * @example
   * ```xml
   * <Defaults panel="@panel/plain" />
   * ```
   */
  Panel: "panel",
  /**
   * Host vector icon, tinted by `foreground`. Not declared by the theme;
   * the id must be one of `ICON_NAMES`.
   *
   * @example
   * ```xml
   * <Button command="wmm.playback.next" icon="@icon/next" />
   * ```
   */
  Icon: "icon",
} as const;

/**
 * One of the {@link ReferenceKind} prefixes.
 *
 * @example
 * ```ts
 * function resolveReference(kind: ReferenceKind, id: string) {}
 * ```
 */
export type ReferenceKind = (typeof ReferenceKind)[keyof typeof ReferenceKind];
