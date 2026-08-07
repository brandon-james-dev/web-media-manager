import type { IAudioProperties, ITagData } from "@/lib/metadata-utils";

export interface Song extends ITagData, IAudioProperties {
  fileHandle?: FileSystemFileHandle;

  id: string;
  path: string;

  coverFront?: Blob;
  coverBack?: Blob;
}
