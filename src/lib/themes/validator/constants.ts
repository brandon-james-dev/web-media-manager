/**
 * Author id grammar: kebab-case, starting with a letter.
 *
 * @example
 * ```xml
 * <Panel id="queue-panel" collapsible="true" />
 * ```
 * @example
 * ```ts
 * AUTHOR_ID.test("queue-panel"); // true
 * ```
 */
export const AUTHOR_ID = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/**
 * Longest author id, in characters.
 *
 * @example
 * ```ts
 * const ok = id.length <= AUTHOR_ID_MAX_LENGTH;
 * ```
 */
export const AUTHOR_ID_MAX_LENGTH = 48;

/**
 * Reference grammar `@kind/id`. Group 1 is the kind and group 2 the id.
 *
 * @example
 * ```xml
 * <Button command="wmm.playback.next" icon="@icon/next" />
 * ```
 * @example
 * ```ts
 * const [, kind, id] = REFERENCE.exec("@icon/next") ?? [];
 * ```
 */
export const REFERENCE = /^@([a-z]+)\/(.+)$/;

/**
 * Id part of a reference: a kebab-case author id, or a lowerCamelCase slot
 * or icon name.
 *
 * @example
 * ```xml
 * <Panel background="@slot/background" border="@color/navy-900" />
 * ```
 * @example
 * ```ts
 * REFERENCE_ID.test("playPause"); // true
 * ```
 */
export const REFERENCE_ID = /^[a-z][a-zA-Z0-9]*(-[a-z0-9]+)*$/;

/**
 * Resource key grammar: two or more dot-separated lowerCamelCase segments.
 *
 * @example
 * ```xml
 * <Button command="wmm.playback.next" labelKey="playback.next" />
 * ```
 * @example
 * ```ts
 * RESOURCE_KEY.test("common.fullScreen"); // true
 * ```
 */
export const RESOURCE_KEY = /^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)+$/;

/**
 * Command id grammar: `wmm.` followed by two or more lowerCamelCase segments.
 *
 * @example
 * ```xml
 * <Button command="wmm.playback.playpause" labelKey="playback.playPause" />
 * ```
 * @example
 * ```ts
 * COMMAND_ID.test("wmm.playback.prev"); // true
 * ```
 */
export const COMMAND_ID = /^wmm(\.[a-z][a-zA-Z0-9]*){2,}$/;

/**
 * Literal color grammar: `#RGB`, `#RRGGBB` or `#RRGGBBAA`.
 *
 * @example
 * ```xml
 * <Button border="#0d2766" foreground="#ffffff80" />
 * ```
 * @example
 * ```ts
 * HEX_COLOR.test("#0d2766"); // true
 * ```
 */
export const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/**
 * Whole number grammar, optionally negative.
 *
 * @example
 * ```xml
 * <TrackList row="0" column="1" />
 * ```
 * @example
 * ```ts
 * INTEGER.test("-2"); // true
 * ```
 */
export const INTEGER = /^-?\d+$/;

/**
 * Non-negative whole number grammar, used for literal pixel lengths.
 *
 * @example
 * ```xml
 * <Panel width="260" />
 * ```
 * @example
 * ```ts
 * NON_NEGATIVE_INTEGER.test("260"); // true
 * ```
 */
export const NON_NEGATIVE_INTEGER = /^\d+$/;

/**
 * Decimal number grammar, optionally negative.
 *
 * @example
 * ```xml
 * <TextStyle id="body" lineHeight="1.4" />
 * ```
 * @example
 * ```ts
 * DECIMAL.test("1.4"); // true
 * ```
 */
export const DECIMAL = /^-?\d+(\.\d+)?$/;

/**
 * Star grid track grammar `N*`. Group 1 is the share.
 *
 * @example
 * ```xml
 * <Grid columns="220 1* 2*" rows="auto 1*" />
 * ```
 * @example
 * ```ts
 * const share = Number(STAR_TRACK.exec("2*")?.[1]);
 * ```
 */
export const STAR_TRACK = /^(\d+)\*$/;

/**
 * Most tracks in a Grid `columns` or `rows` value.
 *
 * @example
 * ```ts
 * const ok = tracks.length <= MAX_GRID_TRACKS;
 * ```
 */
export const MAX_GRID_TRACKS = 12;

/**
 * Largest star share `N` in an `N*` grid track.
 *
 * @example
 * ```ts
 * const ok = share >= 1 && share <= MAX_STAR_SHARE;
 * ```
 */
export const MAX_STAR_SHARE = 100;
