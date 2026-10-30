import type { IOnlineMetadata } from "./online/IOnlineMetadata";
import type { MetadataProvider } from "./online/MetadataProvider";
import { OnlineMetadataResolver } from "./online/OnlineMetadataResolver";
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
