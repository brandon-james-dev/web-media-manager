import { useNowPlayingUi } from "@/hooks/useNowPlayingUi";
import { usePlayback } from "@/hooks/usePlayback";
import { useSync } from "@/hooks/useSync";
import type { ButtonState } from "../buttonState";
import { computeButtonState } from "../buttonState";
import { useThemeLayoutSnapshot, useThemeRender } from "./ThemeRenderContext";

/**
 * The host-driven decoration of one theme button, read from the playback,
 * sync and Now Playing hooks plus the layout state.
 *
 * @example
 * ```xml
 * <Button command="wmm.playback.playpause" labelKey="playback.playPause" />
 * ```
 * @example
 * ```ts
 * const state = useButtonState("wmm.playback.playpause");
 * state.active; // true while playing
 * ```
 */
export function useButtonState(
  command: string,
  commandParameter?: string
): ButtonState {
  const snapshot = useThemeLayoutSnapshot();
  const { analysis } = useThemeRender();
  const { isPlaying, shuffle, repeat, muted } = usePlayback();
  const { queuedSongs, isSyncing, isReadingDevices } = useSync();
  const { nowPlayingOpen, fullscreen, darkRoom } = useNowPlayingUi();

  const overlayPage = snapshot.overlayOpen
    ? analysis?.pages.find((page) => page.overlay)
    : undefined;
  const shownPageId = overlayPage?.id ?? snapshot.currentPage;
  const nowPlayingPage =
    analysis?.pages.some(
      (page) => page.id === shownPageId && page.role === "nowPlaying"
    ) ?? false;

  return computeButtonState(command, commandParameter, {
    isPlaying,
    shuffle,
    repeat,
    muted,
    queuedCount: queuedSongs.length,
    syncing: isSyncing,
    readingDevices: isReadingDevices,
    nowPlayingOpen,
    nowPlayingPage,
    fullscreen,
    darkRoom,
    currentPage: snapshot.currentPage,
    openPanels: snapshot.openPanels,
    editMode: snapshot.editMode,
  });
}
