import { getSourcesStore } from "@/core/ports";
import { getStrategy } from "@/lib/sources";
import { backgroundService } from "./BackgroundService";
import { forgetJob, takeInterruptedJobs } from "./jobPersistence";

const RESUMABLE_TYPES = new Set(["Thumbnail Generation", "Bulk Edit"]);

/**
 * Restore jobs a previous session left unfinished (browser closed or crashed
 * mid-job). Imports restart through their source's strategy so credentials
 * are resolved fresh; other jobs re-run with their saved checkpoint as
 * `payload.resume`. Returns the ids of sources whose import was restored, so
 * the startup resync does not queue a second one.
 */
export async function resumeInterruptedJobs(): Promise<Set<string>> {
  const restoredSourceIds = new Set<string>();
  const interrupted = await takeInterruptedJobs();
  if (interrupted.length === 0) return restoredSourceIds;

  const sources = await getSourcesStore().getSources();

  for (const job of interrupted) {
    if (job.type === "Bulk Import") {
      forgetJob(job.id);
      const sourceId = job.payload?.musicSource?.id as string | undefined;
      const source = sources.find((s) => s.id === sourceId);
      if (!source) continue;
      const handle = await getStrategy(source.kind)?.sync?.({
        source,
        silent: job.silent,
      });
      if (handle) restoredSourceIds.add(source.id);
      continue;
    }

    if (!RESUMABLE_TYPES.has(job.type)) {
      forgetJob(job.id);
      continue;
    }

    backgroundService.enqueue(
      {
        type: job.type,
        silent: job.silent,
        payload: { ...job.payload, resume: job.checkpoint },
      },
      job.id
    );
  }

  return restoredSourceIds;
}
