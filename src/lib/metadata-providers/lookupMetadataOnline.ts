import { getMetadataProviderRegistry } from "@/core/ports";
import type { IOnlineMetadata } from "./online/IOnlineMetadata";
import type { MetadataProvider } from "./online/MetadataProvider";
import type { WorkerProgress } from "@/workers/WorkerJob";

/**
 * Look a query up with one registered metadata provider.
 *
 * Resolves through the provider registry, so a built-in provider and an
 * installed plugin provider are reached the same way. Throws when the id is
 * unknown, which is what the worker reports as a failed job.
 *
 * @example
 * ```ts
 * const results = await lookupMetadataOnline("itunes", "kind of blue", () => false, () => {});
 * ```
 */
export async function lookupMetadataOnline(
  provider: MetadataProvider,
  query: string,
  isCancelled: () => boolean,
  reportProgress: (progress: WorkerProgress) => void
): Promise<IOnlineMetadata[] | null> {
  const service = getMetadataProviderRegistry().getService(provider);
  if (!service) {
    throw new Error(`Unknown metadata provider "${provider}".`);
  }

  return await service.lookup(query, {
    isCancelled,
    reportProgress: (progress) => reportProgress(progress as WorkerProgress),
  });
}
