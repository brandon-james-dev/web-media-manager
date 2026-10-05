import type { IpodArtworkFormat } from "./IpodArtworkFormat";

export interface IpodArtwork {
  id: string;
  formats: IpodArtworkFormat[];
}
