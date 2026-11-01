import { ArtworkType, type IPicture } from "../../contracts";
import type { IOnlineMetadata } from "../online/IOnlineMetadata";
import type { IOnlineMetadataService } from "../online/IOnlineMetadataService";
import { MetadataProvider } from "../online/MetadataProvider";
import type { IItunesSongResult } from "./IItunesSongResult";

export class ItunesMetadataService implements IOnlineMetadataService {
  async lookup(query: string): Promise<IOnlineMetadata[] | null> {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song`;
    const res = await fetch(url);
    const data = await res.json();

    const resultsRaw: IItunesSongResult[] = data.results;
    if (!resultsRaw?.length) return null;

    const results: IOnlineMetadata[] = [];

    for (const song of resultsRaw) {
      let pictures: IPicture[] = [];

      if (song.artworkUrl100) {
        // Search returns only the thumbnail URL (100x100). The full-size
        // 1000x1000 image is fetched only on Apply — never during search.
        pictures.push({
          mimeType: "image/jpeg",
          url: song.artworkUrl100,
          type: ArtworkType.FrontCover,
          description: "Front Cover",
        });
      }

      results.push({
        source: MetadataProvider.iTunes,

        title: song.trackName,
        artist: song.artistName,
        album: song.collectionName,
        albumArtist: song.collectionArtistName,
        genre: song.primaryGenreName,

        year: song.releaseDate
          ? new Date(song.releaseDate).getFullYear()
          : undefined,
        track: song.trackNumber,
        totalTracks: song?.trackCount,
        discNumber: song.discNumber,
        totalDiscs: song?.discCount,
        bpm: song.bpm,

        composer: song.composer,
        isrc: song.isrc,

        pictures,
      });
    }

    return results;
  }
}
