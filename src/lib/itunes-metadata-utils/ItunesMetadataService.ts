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

    let coverFront: Blob | null = null;
    if (song.artworkUrl100) {
      const imgRes = await fetch(
        song.artworkUrl100.replace("100x100", "1000x1000")
      );
      coverFront = await imgRes.blob();
    }

    return {
      title: song.trackName,
      artist: song.artistName,
      album: song.collectionName,
      year: new Date(song.releaseDate).getFullYear(),
      genre: song.primaryGenreName,
      coverFront,
      source: MetadataProvider.iTunes,
      trackId: `${song.trackId}`,
    };
  }
}
