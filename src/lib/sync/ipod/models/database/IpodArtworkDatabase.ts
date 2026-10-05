import type { IpodArtwork, IpodArtworkFormat } from "../entities";

export interface IpodArtworkDatabase {
  artworks: IpodArtwork[];
  formats: IpodArtworkFormat[];
}
