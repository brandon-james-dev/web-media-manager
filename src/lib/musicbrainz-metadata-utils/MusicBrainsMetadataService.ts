import type { IPicture } from "../metadata-utils";
import type { IOnlineMetadata } from "../online-metadata-utils/IOnlineMetadata";
import type { IOnlineMetadataService } from "../online-metadata-utils/IOnlineMetadataService";
import { MetadataProvider } from "../online-metadata-utils/MetadataProvider";

export class MusicBrainzMetadataService implements IOnlineMetadataService {
  async lookup(query: string): Promise<IOnlineMetadata | null> {
    const url = `https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(query)}&fmt=json`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.recordings?.length) return null;

    const rec = data.recordings[0];
    const release = rec.releases?.[0];

    // Fetch cover art
    let pictures: IPicture[] = [];

    if (release?.id) {
      try {
        const imgRes = await fetch(
          `https://coverartarchive.org/release/${release.id}/front`
        );
        if (imgRes.ok) {
          const data = await imgRes.bytes();

          pictures.push({
            data: data,
            mimeType: "image/jpeg",
            type: "FrontCover",
            description: "Front Cover",
          } as IPicture);
        }
      } catch {}
    }

    return {
      source: MetadataProvider.MusicBrainz,

      // Core fields
      title: rec.title,
      artist: rec["artist-credit"]?.[0]?.name,
      album: release?.title,

      // Numeric fields
      year: release?.date ? Number(release.date.slice(0, 4)) : undefined,
      track: release?.media?.[0]?.tracks?.[0]?.number
        ? Number(release.media[0].tracks[0].number)
        : undefined,
      disc: release?.media?.[0]?.position ?? undefined,

      // Extended fields
      isrc: rec.isrcs?.[0] ?? undefined,

      // Artwork
      pictures,
    };
  }
}
