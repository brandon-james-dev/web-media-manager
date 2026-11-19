/**
 * The host-owned vector icons a theme can name with `@icon/<name>`. Icons are
 * tinted with the button or text foreground. A few swap with host state:
 * `playPause`, `fullscreen` and `mute` on `active`, and `repeat` to
 * repeat-one on `active=one`. The set grows additively.
 *
 * @example
 * ```xml
 * <Button command="wmm.playback.playpause" labelKey="playback.playPause"
 *         icon="@icon/playPause" display="icon" />
 * ```
 * @example
 * ```ts
 * const known = (ICON_NAMES as readonly string[]).includes(id);
 * ```
 */
export const ICON_NAMES = [
  "play",
  "pause",
  "playPause",
  "stop",
  "next",
  "prev",
  "shuffle",
  "repeat",
  "volume",
  "mute",
  "search",
  "settings",
  "sync",
  "device",
  "library",
  "artists",
  "albums",
  "playlists",
  "nowPlaying",
  "visualizer",
  "edit",
  "add",
  "close",
  "back",
  "menu",
  "more",
  "queue",
  "lyrics",
  "fullscreen",
  "darkRoom",
  "seekForward",
  "seekBack",
  "favorite",
  "sidebar",
] as const;

/**
 * One of the {@link ICON_NAMES}.
 *
 * @example
 * ```ts
 * function isIconName(id: string): id is IconName {
 *   return (ICON_NAMES as readonly string[]).includes(id);
 * }
 * ```
 */
export type IconName = (typeof ICON_NAMES)[number];
