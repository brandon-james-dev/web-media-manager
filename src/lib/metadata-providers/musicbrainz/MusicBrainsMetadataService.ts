import { ArtworkType, type IPicture } from "../../contracts";
import type {
  IOnlineAlbumMetadata,
  IOnlineAlbumTrack,
} from "../online/IOnlineAlbumMetadata";
import type { IOnlineAlbumService } from "../online/IOnlineAlbumService";
import type { IOnlineMetadata } from "../online/IOnlineMetadata";
import type { IOnlineMetadataService } from "../online/IOnlineMetadataService";
import { MetadataProvider } from "../online/MetadataProvider";
import type {
  IMusicBrainzArtistCredit,
  IMusicBrainzRecording,
  IMusicBrainzRelease,
  IMusicBrainzReleaseSearchResult,
} from "./IMusicBrainzRecording";

/** Abort a fetch after `ms` so a stalled request can't hang the search. */
function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal }).finally(() =>
    clearTimeout(timer)
  );
}

/** Fetch JSON with the same timeout and error reporting as `lookup`. */
async function fetchJson<T>(url: string, ms = 15000): Promise<T> {
  let res: Response;
  try {
    res = await fetchWithTimeout(url, ms);
  } catch (e) {
    throw new Error(
      `MusicBrainz request timed out or failed: ${e instanceof Error ? e.message : String(e)}`
    );
  }

  if (!res.ok) {
    let apiError = "";
    try {
      const body = await res.json();
      apiError = body?.error ?? "";
    } catch {
      // ignore parse failure — fall back to status text
    }
    throw new Error(
      `MusicBrainz request failed (${res.status})` +
        (apiError ? `: ${apiError}` : "")
    );
  }

  return (await res.json()) as T;
}

/** Cover Art Archive thumbnail sizes, most desirable first. Size availability
 * is per-release, so fall through until one responds (200). */
const COVERART_SIZES = ["1200", "500", "250", ""];

async function resolveCoverArtThumb(
  releaseId: string,
  ms = 6000
): Promise<string | null> {
  for (const size of COVERART_SIZES) {
    const suffix = size ? `-${size}` : "";
    const url = `https://coverartarchive.org/release/${releaseId}/front${suffix}`;
    try {
      // HEAD probe: status-only, no image bytes downloaded during search.
      // (coverartarchive follows redirects; a successful HEAD after redirect
      // means the size resolves.) The body is only downloaded on Apply.
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), ms);
      const res = await fetch(url, {
        method: "HEAD",
        redirect: "follow",
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));
      if (res.ok) {
        return url;
      }
    } catch {
      // Try the next size.
    }
  }
  return null;
}

function joinCredits(
  credits: IMusicBrainzArtistCredit[] | undefined,
  field: "name" | "sort-name" = "name"
): string | undefined {
  if (!credits?.length) return undefined;
  return credits
    .map((c) => {
      const value =
        field === "sort-name" ? (c.artist?.["sort-name"] ?? c.name) : c.name;
      return value + (c.joinphrase ?? "");
    })
    .join("")
    .trim();
}

export class MusicBrainzMetadataService
  implements IOnlineMetadataService, IOnlineAlbumService
{
  async lookup(
    query: string,
    _isCancelled?: () => boolean,
    _reportProgress?: (progress: any) => void
  ): Promise<IOnlineMetadata[] | null> {
    // The panel passes "title|artist|album" (structured). Build a precise
    // scoped Lucene query — no split heuristic, exact fields per term.
    const [title, artist, album] = query
      .split("|")
      .map((s) => s.trim().replace(/"/g, ""));
    const terms: string[] = [];
    if (title) terms.push(`recording:"${title}"`);
    if (artist) terms.push(`artist:"${artist}"`);
    if (album) terms.push(`release:"${album}"`);
    const luceneQuery = terms.join(" AND ");
    const url = `https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(luceneQuery)}&fmt=json`;

    let res: Response;
    try {
      res = await fetchWithTimeout(url, 15000);
    } catch (e) {
      throw new Error(
        `MusicBrainz request timed out or failed: ${e instanceof Error ? e.message : String(e)}`
      );
    }

    if (!res.ok) {
      // MusicBrainz throttles clients that don't identify themselves (the
      // browser can't send a custom User-Agent). Detect it and surface the
      // API's own message instead of silently showing "no results".
      let apiError = "";
      try {
        const body = await res.json();
        apiError = body?.error ?? "";
      } catch {
        // ignore parse failure — fall back to status text
      }
      throw new Error(
        `MusicBrainz request failed (${res.status})` +
          (apiError ? `: ${apiError}` : "")
      );
    }

    const data = await res.json();

    const recordings: IMusicBrainzRecording[] = data.recordings;
    if (!recordings?.length) return null;

    const results: IOnlineMetadata[] = [];

    for (const rec of recordings) {
      const release: IMusicBrainzRelease | undefined = rec.releases?.[0];

      const pictures: IPicture[] = [];
      const bestDate = release?.date || rec["first-release-date"];

      if (release?.id) {
        // Search returns only the thumbnail URL — never download the image
        // during search. The full-size image is fetched only on Apply. Size
        // availability is per-release, so resolve the first working size.
        const thumbUrl = await resolveCoverArtThumb(release.id);
        if (thumbUrl) {
          pictures.push({
            mimeType: "image/jpeg",
            url: thumbUrl,
            type: ArtworkType.FrontCover,
            description: "Front Cover",
          });
        }
      }

      let track: number | undefined;
      let disc: number | undefined;
      let totalTracks: number | undefined;
      let totalDiscs: number | undefined;

      const media = release?.media?.[0];
      if (media) {
        disc = media.position ?? undefined;
        totalTracks = media["track-count"] ?? undefined;
        totalDiscs = release?.media?.length ?? undefined;

        const trackEntry = (media.track ?? media.tracks)?.[0];
        if (trackEntry?.number) {
          const parsed = Number(trackEntry.number);
          track = isNaN(parsed) ? undefined : parsed;
        }
      }

      const credits = rec["artist-credit"];
      const releaseCredits = release?.["artist-credit"];
      const group = release?.["release-group"];
      const tags = rec.genres?.length ? rec.genres : rec.tags;
      const genre = tags?.map((t) => t.name).join("; ") || undefined;
      const isVariousArtists =
        group?.["secondary-types"]?.includes("Compilation");
      const releaseType = [
        group?.["primary-type"],
        ...(group?.["secondary-types"] ?? []),
      ]
        .filter(Boolean)
        .join("; ");

      results.push({
        source: MetadataProvider.MusicBrainz,

        title: rec.title,
        artist: joinCredits(credits),
        artistSort: joinCredits(credits, "sort-name"),
        albumArtist: joinCredits(releaseCredits),
        albumArtistSort: joinCredits(releaseCredits, "sort-name"),
        album: release?.title,

        genre,

        year: bestDate ? Number(bestDate.slice(0, 4)) : undefined,
        date: bestDate,
        originalDate: rec["first-release-date"],
        track,
        totalTracks,
        discNumber: disc,
        totalDiscs,
        duration: rec.length ? rec.length / 1000 : undefined,

        isrc: rec.isrcs?.[0] ?? undefined,
        label: release?.["label-info"]?.find((l) => l.label?.name)?.label?.name,
        releaseType: releaseType || undefined,
        compilation: isVariousArtists ? true : undefined,

        musicbrainzTrackId: rec.id ?? undefined,
        musicbrainzReleaseId: release?.id,
        musicbrainzArtistId: credits?.[0]?.artist?.id ?? undefined,
        musicbrainzReleaseGroupId: group?.id ?? undefined,

        pictures,
      });
    }

    return results;
  }

  async searchAlbums(query: string): Promise<IOnlineAlbumMetadata[] | null> {
    // The panel passes "title|artist|album" (structured), same as the song
    // lookup. For an album search the title field carries the album name.
    const [title, artist, album] = query
      .split("|")
      .map((s) => s.trim().replace(/"/g, ""));
    const releaseTerm = album || title;

    const terms: string[] = [];
    if (releaseTerm) terms.push(`release:"${releaseTerm}"`);
    if (artist) terms.push(`artist:"${artist}"`);
    const luceneQuery = terms.join(" AND ");

    const url = `https://musicbrainz.org/ws/2/release/?query=${encodeURIComponent(luceneQuery)}&fmt=json&limit=10`;
    const data = await fetchJson<{
      releases?: IMusicBrainzReleaseSearchResult[];
    }>(url);

    const releases = data.releases;
    if (!releases?.length) return null;

    return releases.map((release) => {
      const credits = release["artist-credit"];
      return {
        source: MetadataProvider.MusicBrainz,
        id: release.id,
        title: release.title,
        artist: joinCredits(credits),
        albumArtist: joinCredits(credits),
        year: release.date ? Number(release.date.slice(0, 4)) : undefined,
        trackCount: release["track-count"],
      };
    });
  }

  async searchAlbumArt(query: string): Promise<IPicture[] | null> {
    const albums = await this.searchAlbums(query);
    if (!albums?.length) return null;

    const thumbs = await Promise.all(
      albums.map((album) => resolveCoverArtThumb(album.id))
    );

    const pictures: IPicture[] = [];
    for (const thumbUrl of thumbs) {
      if (!thumbUrl) continue;
      pictures.push({
        mimeType: "image/jpeg",
        url: thumbUrl,
        type: ArtworkType.FrontCover,
        description: "Front Cover",
      });
    }

    return pictures.length > 0 ? pictures : null;
  }

  async lookupAlbumTracks(
    album: IOnlineAlbumMetadata
  ): Promise<IOnlineAlbumMetadata | null> {
    const url = `https://musicbrainz.org/ws/2/release/${encodeURIComponent(album.id)}?inc=recordings+artist-credits&fmt=json`;
    const release = await fetchJson<IMusicBrainzRelease>(url);

    const tracks: IOnlineAlbumTrack[] = [];
    for (const media of release.media ?? []) {
      for (const entry of media.track ?? media.tracks ?? []) {
        const parsed = Number(entry.number);
        tracks.push({
          title: entry.title ?? "",
          track: isNaN(parsed) ? undefined : parsed,
          discNumber: media.position,
          duration: entry.length ? entry.length / 1000 : undefined,
        });
      }
    }

    // Cover art is resolved here, at Apply time, so the search itself stays
    // one request per provider.
    const thumbUrl = await resolveCoverArtThumb(release.id);
    const pictures: IPicture[] = thumbUrl
      ? [
          {
            mimeType: "image/jpeg",
            url: thumbUrl,
            type: ArtworkType.FrontCover,
            description: "Front Cover",
          },
        ]
      : (album.pictures ?? []);

    const credits = release["artist-credit"];

    return {
      ...album,
      title: release.title || album.title,
      artist: joinCredits(credits) ?? album.artist,
      albumArtist: joinCredits(credits) ?? album.albumArtist,
      year: release.date ? Number(release.date.slice(0, 4)) : album.year,
      pictures,
      tracks,
    };
  }
}
