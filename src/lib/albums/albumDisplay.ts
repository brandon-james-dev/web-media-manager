import type { Album, Song } from "@/models";

/**
 * Shared album-display helpers: the grouping/ordering rules both the artist
 * view and the album modal need, so a track list and an album's genre/year
 * read the same everywhere.
 */

/** Album tracks in play order: tag track number when present, then title. */
export function trackSorted(album: Album): Song[] {
  return [...album.songs].sort((a, b) => {
    const ta = a.track;
    const tb = b.track;
    if (ta != null && tb != null && ta !== tb) return ta - tb;
    if (ta != null && tb == null) return -1;
    if (ta == null && tb != null) return 1;
    return (a.title ?? "").localeCompare(b.title ?? "");
  });
}

/** First song carrying artwork (drives album art selection). */
export function albumPictureSong(album: Album): Song | undefined {
  return album.songs.find((s) => s.pictures?.length) ?? album.songs[0];
}

/** Genre/year aren't on the album record — taken from its tracks. */
export function albumGenre(album: Album): string | undefined {
  return album.songs.find((s) => s.genre)?.genre;
}

export function albumYear(album: Album): number | undefined {
  return album.songs.find((s) => s.year)?.year;
}
