/**
 * What the Now Playing overlay is showing: whether it is open, whether it is
 * fullscreen, and whether the dark room is on.
 *
 * @example
 * ```xml
 * <NowPlaying transport="true" />
 * ```
 * @example
 * ```ts
 * const state: NowPlayingUiState = {
 *   nowPlayingOpen: true,
 *   fullscreen: false,
 *   darkRoom: true,
 * };
 * ```
 */
export interface NowPlayingUiState {
  nowPlayingOpen: boolean;
  fullscreen: boolean;
  darkRoom: boolean;
}

/**
 * A read-only external store of {@link NowPlayingUiState}, shaped for
 * `useSyncExternalStore`.
 *
 * @example
 * ```xml
 * <Button command="wmm.ui.toggleDarkRoom" labelKey="playback.darkRoom" />
 * ```
 * @example
 * ```ts
 * useSyncExternalStore(store.subscribe, store.getSnapshot);
 * ```
 */
export interface NowPlayingUiStore {
  subscribe(listener: () => void): () => void;
  getSnapshot(): NowPlayingUiState;
}
