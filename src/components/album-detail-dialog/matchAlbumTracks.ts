import type { IOnlineAlbumTrack } from "@/lib/metadata-providers/online/IOnlineAlbumMetadata";

/**
 * Pair the album's rows with a looked-up track list. Numbered rows match by
 * track number; unnumbered rows (or a list without numbers) fall back to
 * position, so a lookup still fills a library that has no track tags.
 */
export function matchAlbumTracks(
  rows: Array<{ track?: number }>,
  tracks: IOnlineAlbumTrack[]
): Array<IOnlineAlbumTrack | undefined> {
  if (tracks.length === 0) return rows.map(() => undefined);

  const numbered =
    rows.some((row) => row.track != null) &&
    tracks.some((track) => track.track != null);

  return rows.map((row, index) => {
    if (!numbered || row.track == null) return tracks[index];
    return tracks.find((track) => track.track === row.track) ?? tracks[index];
  });
}
