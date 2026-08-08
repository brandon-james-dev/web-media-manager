import type { IPicture } from "../metadata-utils";
import type { IOnlineMetadata } from "../online-metadata-utils/IOnlineMetadata";
import type { IOnlineMetadataService } from "../online-metadata-utils/IOnlineMetadataService";
import { MetadataProvider } from "../online-metadata-utils/MetadataProvider";

export class ItunesMetadataService implements IOnlineMetadataService {
  async lookup(query: string): Promise<IOnlineMetadata | null> {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.results?.length) return null;

    const song = data.results[0];

    // Fetch high-res artwork
    let pictures: IPicture[] = [];

    if (song.artworkUrl100) {
      const imgRes = await fetch(
        song.artworkUrl100.replace("100x100", "1000x1000")
      );
      const data = await imgRes.bytes();

      pictures.push({
        data: data,
        mimeType: "image/jpeg",
        type: "FrontCover",
        description: "Front Cover",
      } as IPicture);
    }

    return {
      source: MetadataProvider.iTunes,

      // Core fields
      title: song.trackName,
      artist: song.artistName,
      album: song.collectionName,
      albumArtist: song.collectionArtistName ?? undefined,
      genre: song.primaryGenreName,

      // Numeric fields
      year: song.releaseDate
        ? new Date(song.releaseDate).getFullYear()
        : undefined,
      track: song.trackNumber,
      disc: song.discNumber,
      bpm: song.bpm ?? undefined,

      // Extended fields
      composer: song.composer ?? undefined,
      isrc: song.isrc ?? undefined,
    };
  }
}
