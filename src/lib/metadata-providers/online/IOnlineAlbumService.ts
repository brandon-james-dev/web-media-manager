import type { IPicture } from "../../contracts";
import type { IOnlineAlbumMetadata } from "./IOnlineAlbumMetadata";

/** Album lookup: search returns albums, the track list is fetched on Apply. */
export interface IOnlineAlbumService {
  searchAlbums(query: string): Promise<IOnlineAlbumMetadata[] | null>;
  lookupAlbumTracks(
    album: IOnlineAlbumMetadata
  ): Promise<IOnlineAlbumMetadata | null>;
  /** Cover art only, for the album-art picker grid. */
  searchAlbumArt(query: string): Promise<IPicture[] | null>;
}
