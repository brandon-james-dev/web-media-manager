/**
 * Public UI contracts: the state a view reads without owning it.
 *
 * @example
 * ```xml
 * <Button command="wmm.ui.openNowPlaying" labelKey="playback.nowPlaying" />
 * ```
 * @example
 * ```ts
 * import type { NowPlayingUiState } from "@/core/ui";
 * const open: NowPlayingUiState["nowPlayingOpen"] = false;
 * ```
 *
 * @module
 */
export type { NowPlayingUiState, NowPlayingUiStore } from "./nowPlayingUi";
