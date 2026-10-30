export interface IItunesSongResult {
  trackName: string;
  artistName: string;
  collectionName: string;

  collectionArtistName?: string;

  releaseDate?: string;
  primaryGenreName?: string;

  trackNumber?: number;
  trackCount?: number;

  discNumber?: number;
  discCount?: number;

  bpm?: number;
  isrc?: string;
  composer?: string;

  artworkUrl100?: string;

  // Raw IDs (not mapped into tags)
  trackId?: number;
  collectionId?: number;
  artistId?: number;
}
