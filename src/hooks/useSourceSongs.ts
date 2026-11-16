import { useMemo } from "react";
import { useSync } from "./useSync";
import type { Song, SyncTrack } from "@/models";

/**
 * Map one on-device track to a `Song` row.
 *
 * The device database stores the length in milliseconds while `Song.duration`
 * is seconds, which is what every duration formatter expects — passing the
 * milliseconds through rendered a 3:34 track as "3580:05".
 */
export function syncTrackToSong(deviceId: string, track: SyncTrack): Song {
  return {
    id: `${deviceId}:${track.id}`,
    sourceId: deviceId,
    // The device stores locations colon-separated and rooted; the rest of the
    // app addresses files with `/`-separated paths relative to the source root.
    relativePath: track.path
      ? track.path.replace(/^:/, "").replace(/:/g, "/")
      : "",
    filename: track.title ?? "",
    title: track.title,
    artist: track.artist,
    album: track.album,
    duration: track.durationMs != null ? track.durationMs / 1000 : undefined,
    genre: track.genre,
    year: track.year,
    track: track.trackNumber,
    totalTracks: track.trackTotal,
    discNumber: track.discNumber,
    totalDiscs: track.discTotal,
    bitrate: track.bitrate,
    filesize: track.fileSize ?? 0,
  };
}

/**
 * Songs that live on a sync device, as `Song` rows.
 *
 * A device is a music source, but its tracks are not imported into the
 * library — they stay on the device. So the library views only surface them
 * when the device's source is explicitly selected in the source filter, which
 * is what this hook feeds.
 *
 * Ids are namespaced by device so they cannot collide with library songs, and
 * `filesize` is 0 because the bytes are on the device, not in the store.
 */
export function useSourceSongs(selectedSourceIds: string[]): Song[] {
  const { devices } = useSync();

  return useMemo(() => {
    if (selectedSourceIds.length === 0) {
      return [];
    }

    const wanted = new Set(selectedSourceIds);
    const songs: Song[] = [];

    for (const device of devices) {
      if (!wanted.has(device.id)) {
        continue;
      }

      for (const track of device.media?.tracks ?? []) {
        songs.push(syncTrackToSong(device.id, track));
      }
    }

    return songs;
  }, [devices, selectedSourceIds]);
}
