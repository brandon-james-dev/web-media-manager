/**
 * Grammar an attribute value must follow. Every attribute in the component
 * model declares one, and the validator parses the raw XML string with it.
 *
 * @example
 * ```xml
 * <Panel collapsible="true" padding="4 8" background="@brush/panel" />
 * ```
 * @example
 * ```ts
 * padding: { type: ValueType.Thickness }
 * ```
 */
export const ValueType = {
  /**
   * `true` or `false`.
   *
   * @example
   * ```xml
   * <Panel id="queue" collapsible="true" />
   * ```
   */
  Boolean: "boolean",
  /**
   * Whole number, bounded by the attribute's `min` and `max`.
   *
   * @example
   * ```xml
   * <TrackList row="0" column="1" rowSpan="2" />
   * ```
   */
  Integer: "integer",
  /**
   * Decimal number in a stated range.
   *
   * @example
   * ```xml
   * <TextStyle id="body" lineHeight="1.4" />
   * ```
   */
  Number: "number",
  /**
   * Non-negative integer in CSS pixels, or an `@length/` reference.
   *
   * @example
   * ```xml
   * <Stack gap="@length/gap-md" minWidth="120" />
   * ```
   */
  Length: "length",
  /**
   * A Length, or `auto` to size the element to its content.
   *
   * @example
   * ```xml
   * <Panel width="260" height="auto" />
   * ```
   */
  LengthOrAuto: "lengthOrAuto",
  /**
   * One, two or four Lengths: all sides, vertical and horizontal, or top,
   * right, bottom and left.
   *
   * @example
   * ```xml
   * <Panel padding="4 8" margin="2 4 2 4" />
   * ```
   */
  Thickness: "thickness",
  /**
   * One or four Lengths: all corners, or top-left, top-right, bottom-right
   * and bottom-left.
   *
   * @example
   * ```xml
   * <Panel cornerRadius="6 6 0 0" />
   * ```
   */
  CornerRadius: "cornerRadius",
  /**
   * `#RGB`, `#RRGGBB`, `#RRGGBBAA`, `transparent`, or a `@color/` or
   * `@slot/` reference.
   *
   * @example
   * ```xml
   * <Button border="#0d2766" foreground="@slot/foreground" />
   * ```
   */
  Color: "color",
  /**
   * A Color, or a `@brush/` reference.
   *
   * @example
   * ```xml
   * <Panel background="@brush/chrome-gloss" />
   * ```
   */
  Brush: "brush",
  /**
   * One lowerCamelCase keyword from the attribute's closed `values` list.
   *
   * @example
   * ```xml
   * <Stack orientation="horizontal" />
   * ```
   */
  Enum: "enum",
  /**
   * Space-separated keywords from the attribute's closed `values` list.
   *
   * @example
   * ```xml
   * <TrackList columns="track title artist album duration" />
   * ```
   */
  EnumList: "enumList",
  /**
   * Key of a localized text resource from the app's language packs.
   *
   * @example
   * ```xml
   * <Button command="wmm.playback.next" labelKey="playback.next" />
   * ```
   */
  ResourceKey: "resourceKey",
  /**
   * `@kind/id` reference to a theme token or style. The attribute's
   * `refKinds` lists the kinds it accepts.
   *
   * @example
   * ```xml
   * <Button icon="@icon/play" style="@button/transport" />
   * ```
   */
  Reference: "reference",
  /**
   * Author-chosen identifier, used to target the element from elsewhere in
   * the layout, such as a page id or a collapsible panel id.
   *
   * @example
   * ```xml
   * <Page id="songs" role="library" />
   * ```
   */
  Id: "id",
  /**
   * ID of a theme-invokable command from the app's command taxonomy.
   *
   * @example
   * ```xml
   * <Button command="wmm.playback.playpause" labelKey="playback.playPause" />
   * ```
   */
  Command: "command",
  /**
   * Free text whose meaning is checked by a rule elsewhere, such as the
   * `spec` version or a command parameter.
   *
   * @example
   * ```xml
   * <Button command="wmm.ui.navigate" commandParameter="library" />
   * ```
   */
  String: "string",
  /**
   * 1–12 space-separated grid tracks, each a Length, `auto`, or an `N*` star
   * share with N from 1 to 100.
   *
   * @example
   * ```xml
   * <Grid columns="220 1* 2*" rows="auto 1*" />
   * ```
   */
  GridTracks: "gridTracks",
} as const;

/**
 * One of the {@link ValueType} grammars.
 *
 * @example
 * ```ts
 * function parseValue(raw: string, type: ValueType) {}
 * ```
 */
export type ValueType = (typeof ValueType)[keyof typeof ValueType];
