import type { RepeatState, ShuffleState } from "@/models";

/**
 * The host state a theme button's appearance is derived from. The renderer
 * builds it from the playback, sync and Now Playing hooks plus the layout
 * state, so the computation stays a pure function of plain values.
 *
 * @example
 * ```xml
 * <Button command="wmm.playback.playpause" labelKey="playback.playPause" />
 * ```
 * @example
 * ```ts
 * const snapshot: ButtonStateSnapshot = {
 *   isPlaying: true,
 *   shuffle: "off",
 *   repeat: "off",
 *   muted: false,
 *   queuedCount: 0,
 *   syncing: false,
 *   nowPlayingOpen: false,
 *   nowPlayingPage: false,
 *   fullscreen: false,
 *   darkRoom: false,
 *   currentPage: "library",
 *   openPanels: new Set(),
 *   editMode: false,
 * };
 * ```
 */
export interface ButtonStateSnapshot {
  /** Whether audio is playing. */
  readonly isPlaying: boolean;
  /** The shuffle mode. */
  readonly shuffle: ShuffleState;
  /** The repeat mode. */
  readonly repeat: RepeatState;
  /** Whether the output is muted. */
  readonly muted: boolean;
  /** How many songs are queued for device sync. */
  readonly queuedCount: number;
  /** Whether a device sync is running. */
  readonly syncing: boolean;
  /** True while a device library is being read; syncing waits for it. */
  readonly readingDevices: boolean;
  /** Whether the Now Playing page is visible. */
  readonly nowPlayingOpen: boolean;
  /** Whether the page the layout is showing is the Now Playing page. */
  readonly nowPlayingPage: boolean;
  /** Whether the window is fullscreen. */
  readonly fullscreen: boolean;
  /** Whether dark room is on. */
  readonly darkRoom: boolean;
  /** The page the layout is showing. */
  readonly currentPage: string;
  /** The collapsible panels that are open. */
  readonly openPanels: ReadonlySet<string>;
  /** Whether the library is in edit mode. */
  readonly editMode: boolean;
}

/**
 * The host-driven decoration of one button: the states the stylesheet keys
 * off `data-active`, `data-active-value` and `data-selected`, plus the badge
 * and the disabled flag.
 *
 * @example
 * ```xml
 * <Button command="wmm.playback.toggleRepeat" labelKey="playback.repeat" />
 * ```
 * @example
 * ```ts
 * const state: ButtonState = {
 *   active: true,
 *   activeValue: "one",
 *   selected: false,
 *   disabled: false,
 * };
 * ```
 */
export interface ButtonState {
  /** Whether the button's command is currently on. */
  readonly active: boolean;
  /** The active value a valued `active` state matches. */
  readonly activeValue?: string;
  /** Whether the button's target is the current one. */
  readonly selected: boolean;
  /** A count drawn on the top end corner, when above zero. */
  readonly badge?: number;
  /** Whether the button is rendered but cannot be pressed. */
  readonly disabled: boolean;
}

/**
 * The commands whose `active` state reflects a host toggle. They also carry
 * `aria-pressed`, so assistive technology hears the same state the stylesheet
 * draws.
 *
 * @example
 * ```xml
 * <Button command="wmm.playback.toggleShuffle" labelKey="playback.shuffle" />
 * ```
 * @example
 * ```ts
 * isToggleCommand("wmm.playback.toggleShuffle"); // true
 * isToggleCommand("wmm.ui.navigate"); // false
 * ```
 */
const TOGGLE_COMMANDS: ReadonlySet<string> = new Set([
  "wmm.playback.playpause",
  "wmm.playback.toggleShuffle",
  "wmm.playback.toggleRepeat",
  "wmm.playback.toggleMute",
  "wmm.ui.toggleFullscreen",
  "wmm.ui.toggleDarkRoom",
  "wmm.ui.toggleEditMode",
  "wmm.ui.togglePanel",
]);

/**
 * The page id whose navigate button carries the sync queue badge.
 *
 * @example
 * ```xml
 * <Button command="wmm.ui.navigate" commandParameter="sync" labelKey="navigation.sync" />
 * ```
 * @example
 * ```ts
 * SYNC_PAGE_ID; // "sync"
 * ```
 */
const SYNC_PAGE_ID = "sync";

/**
 * Whether the command's button is a toggle, and therefore reports
 * `aria-pressed`.
 *
 * @example
 * ```xml
 * <Button command="wmm.ui.toggleFullscreen" labelKey="common.fullScreen" />
 * ```
 * @example
 * ```ts
 * isToggleCommand("wmm.ui.toggleFullscreen"); // true
 * ```
 */
export function isToggleCommand(command: string): boolean {
  return TOGGLE_COMMANDS.has(command);
}

/**
 * Computes the host-driven decoration of a theme button from the current
 * host state. A command the catalog gives no state keeps every flag off.
 *
 * @example
 * ```xml
 * <Button command="wmm.ui.navigate" commandParameter="sync" labelKey="navigation.sync" />
 * ```
 * @example
 * ```ts
 * computeButtonState("wmm.ui.navigate", "sync", snapshot);
 * // { active: false, selected: false, badge: 3, disabled: false }
 * ```
 */
export function computeButtonState(
  command: string,
  commandParameter: string | undefined,
  snapshot: ButtonStateSnapshot
): ButtonState {
  switch (command) {
    case "wmm.playback.playpause":
      return state({ active: snapshot.isPlaying });
    case "wmm.playback.toggleShuffle": {
      const active = snapshot.shuffle === "on";
      return state({
        active,
        ...(active ? { activeValue: snapshot.shuffle } : {}),
      });
    }
    case "wmm.playback.toggleRepeat": {
      const active = snapshot.repeat !== "off";
      return state({
        active,
        ...(active ? { activeValue: snapshot.repeat } : {}),
      });
    }
    case "wmm.playback.toggleMute":
      return state({ active: snapshot.muted });
    case "wmm.ui.navigate":
      return state({
        selected: snapshot.currentPage === commandParameter,
        ...(commandParameter === SYNC_PAGE_ID && snapshot.queuedCount > 0
          ? { badge: snapshot.queuedCount }
          : {}),
      });
    case "wmm.ui.openNowPlaying":
      return state({ selected: snapshot.nowPlayingOpen });
    case "wmm.ui.togglePanel":
      return state({
        active:
          commandParameter !== undefined &&
          snapshot.openPanels.has(commandParameter),
      });
    case "wmm.ui.toggleFullscreen":
      return state({
        active: snapshot.fullscreen,
        disabled: !snapshot.nowPlayingPage && !snapshot.fullscreen,
      });
    case "wmm.sync.start":
      return state({ disabled: snapshot.syncing || snapshot.readingDevices });
    case "wmm.ui.toggleDarkRoom":
      return state({ active: snapshot.darkRoom });
    case "wmm.ui.toggleEditMode":
      return state({ active: snapshot.editMode });
    default:
      return state({});
  }
}

/** A button state with every flag off, overridden by the given fields. */
function state(overrides: Partial<ButtonState>): ButtonState {
  return {
    active: false,
    selected: false,
    disabled: false,
    ...overrides,
  };
}
