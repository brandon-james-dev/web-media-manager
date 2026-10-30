import type { Song, SyncDevice } from "@/models";

/**
 * Identity used to decide whether a library song is already on a device.
 *
 * The desktop library (IndexedDB `Song.id`) and the on-device iTunesDB
 * (`SyncTrack.id`, an iTunes trackId) share no identifier, so
 * title/album/artist is the only usable link. The sync writer and the queue
 * filter both go through here so they cannot disagree about what "already
 * present" means.
 */
export function trackIdentity(
  title?: string,
  album?: string,
  artist?: string
): string {
  return [title ?? "", album ?? "", artist ?? ""].join("\u0000");
}

/** Separator-delimited identity of a library song. */
export function songIdentity(song: Song): string {
  return trackIdentity(song.title, song.album, song.artist);
}

/** Identities of every track currently stored on the device. */
export function deviceTrackIdentities(device?: SyncDevice | null): Set<string> {
  const identities = new Set<string>();

  for (const track of device?.media?.tracks ?? []) {
    identities.add(trackIdentity(track.title, track.album, track.artist));
  }

  return identities;
}

/** True when this library song is already on the device. */
export function isSongOnDevice(
  song: Song,
  identities: ReadonlySet<string>
): boolean {
  return identities.has(songIdentity(song));
}
