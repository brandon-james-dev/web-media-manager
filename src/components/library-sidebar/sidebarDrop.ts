/**
 * Drop targets in the library sidebar.
 *
 * A track row is the drag source; a sidebar row is the target. The ids are
 * prefixed so one `onDragEnd` can tell a playlist from a sync device without
 * keeping a second registry of what is on screen.
 */

const PLAYLIST_PREFIX = "sidebar-playlist:";
const SYNC_PREFIX = "sidebar-sync:";
const REMOVE_PREFIX = "sidebar-remove:";
const EMPTY_PREFIX = "sidebar-playlist-empty:";

export type SidebarDropTarget =
  | { kind: "playlist"; playlistId: string }
  | { kind: "sync"; deviceId: string }
  | { kind: "remove"; playlistId: string };

export function sidebarPlaylistDropId(playlistId: string): string {
  return `${PLAYLIST_PREFIX}${playlistId}`;
}

export function sidebarSyncDropId(deviceId: string): string {
  return `${SYNC_PREFIX}${deviceId}`;
}

/** The zone that takes a track out of the playlist it came from. */
export function sidebarRemoveDropId(playlistId: string): string {
  return `${REMOVE_PREFIX}${playlistId}`;
}

/**
 * The empty-state placeholder, which accepts a drop while a drag is active.
 * A separate id from the header so both are never registered at once.
 */
export function sidebarPlaylistEmptyDropId(playlistId: string): string {
  return `${EMPTY_PREFIX}${playlistId}`;
}

/** Read a drop id back, or null when it is not a sidebar target. */
export function parseSidebarDropId(
  id: string | number | undefined
): SidebarDropTarget | null {
  if (id === undefined) {
    return null;
  }

  const value = String(id);

  if (value.startsWith(PLAYLIST_PREFIX)) {
    return { kind: "playlist", playlistId: value.slice(PLAYLIST_PREFIX.length) };
  }

  if (value.startsWith(SYNC_PREFIX)) {
    return { kind: "sync", deviceId: value.slice(SYNC_PREFIX.length) };
  }

  if (value.startsWith(REMOVE_PREFIX)) {
    return { kind: "remove", playlistId: value.slice(REMOVE_PREFIX.length) };
  }

  if (value.startsWith(EMPTY_PREFIX)) {
    return { kind: "playlist", playlistId: value.slice(EMPTY_PREFIX.length) };
  }

  return null;
}

/** The id a draggable track row carries, and the song id read back from it. */
export function trackDragId(songId: string): string {
  return `track:${songId}`;
}

export function songIdFromDrag(
  data: Record<string, unknown> | undefined
): string | null {
  const songId = data?.songId;
  return typeof songId === "string" ? songId : null;
}

/** Every song a drag carries: one track row, or a whole album or artist. */
export function songIdsFromDrag(
  data: Record<string, unknown> | undefined
): string[] {
  const songIds = data?.songIds;
  if (Array.isArray(songIds)) {
    return songIds.filter((id): id is string => typeof id === "string");
  }

  const single = songIdFromDrag(data);
  return single === null ? [] : [single];
}
