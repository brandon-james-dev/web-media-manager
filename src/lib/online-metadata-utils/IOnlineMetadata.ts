import type { ITagData } from "../metadata-utils";
import type { MetadataProvider } from "./MetadataProvider";

export interface IOnlineMetadata extends Partial<ITagData> {
  source: MetadataProvider;
}
