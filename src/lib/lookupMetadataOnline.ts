import type { IOnlineMetadata } from "./online-metadata-utils/IOnlineMetadata";
import type { MetadataProvider } from "./online-metadata-utils/MetadataProvider";
import { OnlineMetadataResolver } from "./online-metadata-utils/OnlineMetadataResolver";
import type { WorkerProgress } from "@/workers/WorkerJob";

export async function lookupMetadataOnline(
  provider: MetadataProvider,
  query: string,
  isCancelled: () => boolean,
  reportProgress: (progress: WorkerProgress) => void
): Promise<IOnlineMetadata[] | null> {
  const service = OnlineMetadataResolver.getService(provider);
  return await service.lookup(query, isCancelled, reportProgress);
}
