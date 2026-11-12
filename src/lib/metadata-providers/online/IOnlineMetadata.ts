import type { IAudioProperties, ITagData } from "../../contracts";
import type { MetadataProvider } from "./MetadataProvider";

export interface IOnlineMetadata
  extends Partial<ITagData>, Partial<Pick<IAudioProperties, "duration">> {
  source: MetadataProvider;
}
