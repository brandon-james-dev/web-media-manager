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

    let coverFront: Blob | null = null;

    if (release?.id) {
      try {
        const imgRes = await fetch(
          `https://coverartarchive.org/release/${release.id}/front`
        );
        if (imgRes.ok) coverFront = await imgRes.blob();
      } catch {}
    }

    return {
      title: rec.title,
      artist: rec["artist-credit"]?.[0]?.name,
      album: release?.title,
      year: release?.date ? Number(release.date.slice(0, 4)) : undefined,
      coverFront,
      source: MetadataProvider.MusicBrainz,
      trackId: rec.id,
    };
  }
}
