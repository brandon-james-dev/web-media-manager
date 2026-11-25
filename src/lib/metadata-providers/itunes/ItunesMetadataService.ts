import { ArtworkType, type IPicture } from "../../contracts";
import type { MetadataLookupOptions } from "@/core/contracts";
import type {
  IOnlineAlbumMetadata,
  IOnlineAlbumTrack,
} from "../online/IOnlineAlbumMetadata";
import type { IOnlineAlbumService } from "../online/IOnlineAlbumService";
import type { IOnlineMetadata } from "../online/IOnlineMetadata";
import type { IOnlineMetadataService } from "../online/IOnlineMetadataService";
import { MetadataProvider } from "../online/MetadataProvider";
import type { IItunesAlbumResult } from "./IItunesAlbumResult";
import type { IItunesSongResult } from "./IItunesSongResult";

const ADVISORY: Record<string, IOnlineMetadata["advisory"]> = {
  explicit: "explicit",
  cleaned: "clean",
  notExplicit: "unspecified",
};

/** Search returns only the thumbnail URL (100x100). The full-size
 * 1000x1000 image is fetched only on Apply — never during search. */
function frontCoverPicture(url?: string): IPicture[] {
  if (!url) return [];
  return [
    {
      mimeType: "image/jpeg",
      url,
      type: ArtworkType.FrontCover,
      description: "Front Cover",
    },
  ];
}

export class ItunesMetadataService
  implements IOnlineMetadataService, IOnlineAlbumService
{
  readonly provider = MetadataProvider.iTunes;

  async lookup(
    query: string,
    _options?: MetadataLookupOptions
  ): Promise<IOnlineMetadata[] | null> {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song`;
    const res = await fetch(url);
    const data = await res.json();

    const resultsRaw: IItunesSongResult[] = data.results;
    if (!resultsRaw?.length) return null;

    return resultsRaw.map((song) => this.mapSong(song));
  }

  async searchAlbums(query: string): Promise<IOnlineAlbumMetadata[] | null> {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=album&limit=10`;
    const res = await fetch(url);
    const data = await res.json();

    const albumsRaw: IItunesAlbumResult[] = data.results;
    if (!albumsRaw?.length) return null;

    return albumsRaw.map((album) => ({
      source: MetadataProvider.iTunes,
      id: String(album.collectionId),
      title: album.collectionName,
      artist: album.artistName,
      albumArtist: album.collectionArtistName ?? album.artistName,
      year: album.releaseDate
        ? new Date(album.releaseDate).getUTCFullYear()
        : undefined,
      genre: album.primaryGenreName,
      trackCount: album.trackCount,
      pictures: frontCoverPicture(album.artworkUrl100),
    }));
  }

  async lookupAlbumTracks(
    album: IOnlineAlbumMetadata
  ): Promise<IOnlineAlbumMetadata | null> {
    const url = `https://itunes.apple.com/lookup?id=${encodeURIComponent(album.id)}&entity=song&limit=200`;
    const res = await fetch(url);
    const data = await res.json();

    const resultsRaw: IItunesSongResult[] = data.results ?? [];
    const songs = resultsRaw.filter(
      (result) => result.wrapperType === "track" || result.kind === "song"
    );

    const tracks: IOnlineAlbumTrack[] = songs
      .map((song) => {
        const mapped = this.mapSong(song);
        return {
          title: mapped.title ?? "",
          track: mapped.track,
          discNumber: mapped.discNumber,
          duration: mapped.duration,
        };
      })
      .sort(
        (a, b) =>
          (a.discNumber ?? 1) - (b.discNumber ?? 1) ||
          (a.track ?? 0) - (b.track ?? 0)
      );

    return { ...album, tracks };
  }

  async searchAlbumArt(query: string): Promise<IPicture[] | null> {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=album&limit=25`;
    const res = await fetch(url);
    const data = await res.json();

    const albumsRaw: IItunesAlbumResult[] = data.results;
    if (!albumsRaw?.length) return null;

    const pictures: IPicture[] = [];
    const seen = new Set<string>();
    for (const album of albumsRaw) {
      const url = album.artworkUrl100;
      if (!url || seen.has(url)) continue;
      seen.add(url);
      pictures.push(...frontCoverPicture(url));
    }

    return pictures.length > 0 ? pictures : null;
  }

  private mapSong(song: IItunesSongResult): IOnlineMetadata {
    const releaseDate = song.releaseDate
      ? new Date(song.releaseDate)
      : undefined;

    const advisory = ADVISORY[song.trackExplicitness ?? ""];

    return {
      source: MetadataProvider.iTunes,

      title: song.trackName,
      artist: song.artistName,
      album: song.collectionName,
      albumArtist: song.collectionArtistName ?? song.artistName,
      genre: song.primaryGenreName,

      year: releaseDate ? releaseDate.getUTCFullYear() : undefined,
      date: song.releaseDate?.slice(0, 10),
      track: song.trackNumber,
      totalTracks: song.trackCount,
      discNumber: song.discNumber,
      totalDiscs: song.discCount,
      bpm: song.bpm,
      duration: song.trackTimeMillis ? song.trackTimeMillis / 1000 : undefined,

      composer: song.composer,
      isrc: song.isrc,
      advisory,
      itunesAdvisory: song.contentAdvisoryRating,
      compilation:
        song.collectionArtistName?.toLowerCase() === "various artists"
          ? true
          : undefined,

      pictures: frontCoverPicture(song.artworkUrl100),
    };
  }
}
