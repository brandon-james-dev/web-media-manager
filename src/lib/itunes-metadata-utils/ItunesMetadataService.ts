import { ArtworkType, type IPicture } from "../metadata-utils";
import type { IOnlineMetadata } from "../online-metadata-utils/IOnlineMetadata";
import type { IOnlineMetadataService } from "../online-metadata-utils/IOnlineMetadataService";
import { MetadataProvider } from "../online-metadata-utils/MetadataProvider";
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
        try {
          const imgRes = await fetch(
            song.artworkUrl100.replace("100x100", "1000x1000")
          );
          const bytes = await imgRes.bytes();

          pictures.push({
            data: bytes,
            mimeType: "image/jpeg",
            type: ArtworkType.FrontCover,
            description: "Front Cover",
          });
        } catch {
          // ignore artwork failures
        }
      }

      results.push({
        source: MetadataProvider.iTunes,

        title: song.trackName,
        artist: song.artistName,
        album: song.collectionName,
        albumArtist: song.collectionArtistName ?? undefined,
        genre: song.primaryGenreName,

        year: song.releaseDate
          ? new Date(song.releaseDate).getFullYear()
          : undefined,
        track: song.trackNumber,
        disc: song.discNumber,
        bpm: song.bpm ?? undefined,

        composer: song.composer ?? undefined,
        isrc: song.isrc ?? undefined,

        pictures,
      });
    }

    return results;
  }
}
