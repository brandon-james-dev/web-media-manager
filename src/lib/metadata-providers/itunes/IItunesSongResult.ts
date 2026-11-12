export interface IItunesSongResult {
  wrapperType?: string;
  kind?: string;

  trackName: string;
  artistName: string;
  collectionName: string;
  collectionArtistName?: string;
  trackCensoredName?: string;
  collectionCensoredName?: string;

  releaseDate?: string;
  primaryGenreName?: string;

  trackNumber?: number;
  trackCount?: number;
  discNumber?: number;
  discCount?: number;
  trackTimeMillis?: number;

  trackExplicitness?: "explicit" | "cleaned" | "notExplicit" | string;
  collectionExplicitness?: string;
  contentAdvisoryRating?: string;

  bpm?: number;
  isrc?: string;
  composer?: string;

  artworkUrl30?: string;
  artworkUrl60?: string;
  artworkUrl100?: string;

  trackId?: number;
  collectionId?: number;
  artistId?: number;
  collectionArtistId?: number;
  country?: string;
}
