import type { IOnlineMetadata } from "./IOnlineMetadata";

export interface IOnlineMetadataService {
  lookup(
    query: string,
    isCancelled?: () => boolean,
    reportProgress?: (progress: any) => void
  ): Promise<IOnlineMetadata[] | null>;
}
