export interface IItunesAlbumResult {
  wrapperType?: string;
  collectionType?: string;

  collectionId: number;
  collectionName: string;
  artistName: string;
  collectionArtistName?: string;

  releaseDate?: string;
  primaryGenreName?: string;
  trackCount?: number;

  artworkUrl30?: string;
  artworkUrl60?: string;
  artworkUrl100?: string;
}
