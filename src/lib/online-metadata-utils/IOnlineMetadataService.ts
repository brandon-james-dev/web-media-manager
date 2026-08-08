import type { IOnlineMetadata } from "./IOnlineMetadata";

export interface IOnlineMetadataService {
  lookup(query: string): Promise<IOnlineMetadata[] | null>;
}
