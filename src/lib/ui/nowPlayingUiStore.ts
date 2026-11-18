import type { WmmEventName, WmmEventPayload } from "@/events";
import { wmmBus } from "@/events";
import type { NowPlayingUiState, NowPlayingUiStore } from "@/core/ui";

/**
 * The event source the store listens to. It is the `on` half of the command
 * bus, so a test can pass a fake instead of the real bus.
 *
 * @example
 * ```xml
 * <Button command="wmm.ui.toggleFullscreen" labelKey="playback.fullscreen" />
 * ```
 * @example
 * ```ts
 * const source: NowPlayingUiEventSource = wmmBus;
 * const off = source.on("wmm.ui.fullscreenChanged", (payload) => {
 *   payload?.fullscreen;
 * });
 * ```
 */
export interface NowPlayingUiEventSource {
  on<E extends WmmEventName>(
    event: E,
    handler: (payload?: WmmEventPayload[E]) => void
  ): () => void;
}

const INITIAL: NowPlayingUiState = {
  nowPlayingOpen: false,
  fullscreen: false,
  darkRoom: false,
};

/**
 * The Now Playing UI state as a framework-free external store. It only
 * listens: the overlay and the player publish the events, and the store
 * republishes a new snapshot when one of the three values changes.
 *
 * @example
 * ```xml
 * <Button command="wmm.ui.closeNowPlaying" labelKey="playback.closeNowPlaying" />
 * ```
 * @example
 * ```ts
 * const store = new NowPlayingUiStateStore(wmmBus);
 * store.getSnapshot().nowPlayingOpen; // false
 * ```
 */
export class NowPlayingUiStateStore implements NowPlayingUiStore {
  private readonly listeners = new Set<() => void>();
  private snapshot: NowPlayingUiState = INITIAL;

  constructor(events: NowPlayingUiEventSource) {
    events.on("wmm.ui.nowPlayingChanged", (payload) => {
      this.update({ nowPlayingOpen: payload?.open ?? false });
    });
    events.on("wmm.ui.fullscreenChanged", (payload) => {
      this.update({ fullscreen: payload?.fullscreen ?? false });
    });
    events.on("wmm.ui.darkRoomChanged", (payload) => {
      this.update({ darkRoom: payload?.enabled ?? false });
    });
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  readonly getSnapshot = (): NowPlayingUiState => this.snapshot;

  private update(patch: Partial<NowPlayingUiState>): void {
    const next = { ...this.snapshot, ...patch };
    if (
      next.nowPlayingOpen === this.snapshot.nowPlayingOpen &&
      next.fullscreen === this.snapshot.fullscreen &&
      next.darkRoom === this.snapshot.darkRoom
    ) {
      return;
    }

    this.snapshot = next;
    for (const listener of this.listeners) listener();
  }
}

let store: NowPlayingUiStateStore | undefined;

/**
 * The app-wide Now Playing UI store, created on first use.
 *
 * @example
 * ```xml
 * <Button command="wmm.ui.toggleDarkRoom" labelKey="playback.darkRoom" />
 * ```
 * @example
 * ```ts
 * getNowPlayingUiStore().getSnapshot().darkRoom; // false
 * ```
 */
export function getNowPlayingUiStore(): NowPlayingUiStateStore {
  store ??= new NowPlayingUiStateStore(wmmBus);
  return store;
}
