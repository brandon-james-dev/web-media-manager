import type { ITagData } from "../contracts";
import type { MetadataProvider } from "./MetadataProvider";

export interface IOnlineMetadata extends Partial<ITagData> {
  source: MetadataProvider;
}
