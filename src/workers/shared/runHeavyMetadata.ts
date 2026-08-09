import type { WorkerProgress } from "@/workers/WorkerJob";
import { OnlineMetadataResolver } from "@/lib/online-metadata-utils/OnlineMetadataResolver";

export async function runHeavyMetadata(
  payload: any,
  isCancelled: () => boolean,
  reportProgress: (progress: WorkerProgress) => void
) {
  reportProgress({
    percent: 0.0,
    overall: 0.0,
    label: `Preparing lookup (${payload.provider})`,
  });

  if (isCancelled()) return { cancelled: true };

  const service = OnlineMetadataResolver.getService(payload.provider);

  reportProgress({
    percent: 0.3,
    overall: 0.3,
    label: `Resolving provider (${payload.provider})`,
  });

  if (isCancelled()) return { cancelled: true };

  const results = await service.lookup(
    payload.query,
    isCancelled,
    reportProgress
  );

  reportProgress({
    percent: 1.0,
    overall: 1.0,
    label: `Lookup complete (${payload.provider})`,
  });

  return { ok: true, results };
}
