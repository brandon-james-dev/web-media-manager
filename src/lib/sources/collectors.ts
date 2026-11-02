/**
 * Worker-safe per-kind music source collectors.
 *
 * `runBulkImport` (and any other worker) must never pull the UI strategy
 * graph (icons, toast, React) into the worker bundle — that broke Bulk
 * Import for every source kind. The pure per-kind "collect this source's
 * songs" operation lives in one file per kind (under `file/` and
 * `subsonic/`), with NO UI imports, and is the single source of truth that
 * both the worker and the UI strategies delegate to.
 */
import type { MusicSource } from "@/models";
import { localMusicSourceCollector } from "./file/LocalMusicSourceCollector";
import { subsonicMusicSourceCollector } from "./subsonic/SubsonicMusicSourceCollector";
import type { IMusicSourceCollector } from "./IMusicSourceCollector";

/** Registry of worker-safe collectors, one per supported source kind. */
export const musicSourceCollectors: IMusicSourceCollector[] = [
  localMusicSourceCollector,
  subsonicMusicSourceCollector,
];

/** Find the collector for a source kind, or null when unsupported. */
export function getCollector(
  kind: MusicSource["kind"]
): IMusicSourceCollector | null {
  return musicSourceCollectors.find((c) => c.kind === kind) ?? null;
}

export { localMusicSourceCollector as fileMusicSourceCollector } from "./file/LocalMusicSourceCollector";
export { subsonicMusicSourceCollector } from "./subsonic/SubsonicMusicSourceCollector";
