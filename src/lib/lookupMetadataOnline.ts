import type { IOnlineMetadata } from "./online-metadata-utils/IOnlineMetadata";
import type { MetadataProvider } from "./online-metadata-utils/MetadataProvider";
import { OnlineMetadataResolver } from "./online-metadata-utils/OnlineMetadataResolver";

export async function lookupMetadataOnline(
  provider: MetadataProvider,
  query: string
): Promise<IOnlineMetadata | null> {
  const service = OnlineMetadataResolver.getService(provider);
  return await service.lookup(query);
}
