import type { IAudioProperties, ITagData } from "@/lib/metadata-utils";

export interface Song extends ITagData, IAudioProperties {
  id: string;

  relativePath: string;
  filename: string;
  filesize: number;

  coverFront?: Blob;
  coverBack?: Blob;
}
