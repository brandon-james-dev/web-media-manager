import { useSyncExternalStore } from "react";
import { getNowPlayingUiStore } from "@/lib/ui/nowPlayingUiStore";
import type { NowPlayingUiState } from "@/core/ui";

/**
 * The Now Playing overlay's open, fullscreen and dark-room state.
 *
 * @example
 * ```xml
 * <Button command="wmm.ui.toggleDarkRoom" labelKey="playback.darkRoom" />
 * ```
 * @example
 * ```tsx
 * const { nowPlayingOpen, darkRoom } = useNowPlayingUi();
 * return <Overlay hidden={!nowPlayingOpen} dark={darkRoom} />;
 * ```
 */
export function useNowPlayingUi(): NowPlayingUiState {
  const store = getNowPlayingUiStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}
