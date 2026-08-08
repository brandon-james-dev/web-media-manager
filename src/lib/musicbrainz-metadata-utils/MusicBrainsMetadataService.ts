import type { IPicture } from "../metadata-utils";
import type { IOnlineMetadata } from "../online-metadata-utils/IOnlineMetadata";
import type { IOnlineMetadataService } from "../online-metadata-utils/IOnlineMetadataService";
import { MetadataProvider } from "../online-metadata-utils/MetadataProvider";
import type {
  IMusicBrainzRecording,
  IMusicBrainzRelease,
} from "./IMusicBrainzRecording";

export class MusicBrainzMetadataService implements IOnlineMetadataService {
  async lookup(query: string): Promise<IOnlineMetadata[] | null> {
    const url = `https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(query)}&fmt=json`;
    const res = await fetch(url);
    const data = await res.json();

    const recordings: IMusicBrainzRecording[] = data.recordings;
    if (!recordings?.length) return null;

    const results: IOnlineMetadata[] = [];

    for (const rec of recordings) {
      const release: IMusicBrainzRelease | undefined = rec.releases?.[0];

      let pictures: IPicture[] = [];

      if (release?.id) {
        try {
          const imgRes = await fetch(
            `https://coverartarchive.org/release/${release.id}/front`
          );
          if (imgRes.ok) {
            const bytes = await imgRes.bytes();
            pictures.push({
              data: bytes,
              mimeType: "image/jpeg",
              type: "FrontCover",
              description: "Front Cover",
            });
          }
        } catch {
          // ignore artwork failures
        }
      }

      let track: number | undefined;
      let disc: number | undefined;

      const media = release?.media?.[0];
      if (media) {
        disc = media.position ?? undefined;

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
        album: release?.title,

        year: release?.date ? Number(release.date.slice(0, 4)) : undefined,
        track,
        disc,

        isrc: rec.isrcs?.[0] ?? undefined,

        pictures,
      });
    }

    return results;
  }
}
