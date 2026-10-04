import type { IOnlineMetadata } from "./IOnlineMetadata";

export interface IMetadataMapper<TInput> {
  map(input: TInput): Promise<IOnlineMetadata | null>;
}
