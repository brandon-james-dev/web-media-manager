import type { ArtworkType } from "./ArtworkType";

export interface IPicture {
  mimeType: string;
  data: Uint8Array;
  type: ArtworkType;
  description?: string;
}
