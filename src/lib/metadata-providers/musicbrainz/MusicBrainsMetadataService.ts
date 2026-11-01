import { ArtworkType, type IPicture } from "../../contracts";
import type { IOnlineMetadata } from "../online/IOnlineMetadata";
import type { IOnlineMetadataService } from "../online/IOnlineMetadataService";
import { MetadataProvider } from "../online/MetadataProvider";
import type {
  IMusicBrainzRecording,
  IMusicBrainzRelease,
} from "./IMusicBrainzRecording";

/** Abort a fetch after `ms` so a stalled request can't hang the search. */
function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal }).finally(() =>
    clearTimeout(timer)
  );
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

export class MusicBrainzMetadataService implements IOnlineMetadataService {
  async lookup(
    query: string,
    _isCancelled?: () => boolean,
    _reportProgress?: (progress: any) => void
  ): Promise<IOnlineMetadata[] | null> {
    // The panel passes "title|artist|album" (structured). Build a precise
    // scoped Lucene query — no split heuristic, exact fields per term.
    const [title, artist, album] = query.split("|").map((s) => s.trim().replace(/"/g, ""));
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

      let pictures: IPicture[] = [];

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

        const trackEntry = media.tracks?.[0];
        if (trackEntry?.number) {
          const parsed = Number(trackEntry.number);
          track = isNaN(parsed) ? undefined : parsed;
        }
      }

      results.push({
        source: MetadataProvider.MusicBrainz,

        title: rec.title,
        artist: rec["artist-credit"]?.[0]?.name,
        albumArtist: release?.["artist-credit"]?.[0]?.name,
        album: release?.title,

        genre: rec.genres?.[0]?.name ?? rec.tags?.[0]?.name,

        year: release?.date ? Number(release.date.slice(0, 4)) : undefined,
        track,
        totalTracks,
        discNumber: disc,
        totalDiscs,

        isrc: rec.isrcs?.[0] ?? undefined,

        mbTrackId: rec.id ?? undefined,
        mbArtistId: rec["artist-credit"]?.[0]?.artist?.id ?? undefined,
        mbReleaseGroupId: release?.["release-group"]?.id ?? undefined,

        pictures,
      });
    }

    return results;
  }
}
