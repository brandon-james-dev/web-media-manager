/**
 * WMM Application Core.
 *
 * The shared, domain-oriented application functions, organized to mirror
 * the Open Subsonic API. Each domain folder exposes wrappers around the
 * existing `@/lib` implementation layer, so the core can later back a Hono
 * server implementing Open Subsonic without logic changes.
 *
 *   system     — ping, scan status, store initialization
 *   browsing   — album lists, folders, genres, song lookup
 *   searching  — local + online (MusicBrainz/iTunes) search
 *   scanning   — library scan, folder add, clear
 *   media      — cover art / artwork retrieval
 *   metadata   — tag read/write, rename
 *   playlists  — play queue + playlist (Open Subsonic playQueue)
 *   jobs       — background-job contract (types, progress aggregation, IJobRunner port)
 *   events     — event/command taxonomy + WmmBus (Step 1/2 of the event layer)
 *
 * Contracts (ID3-aligned JSON view types + mappers) live in `./contracts`.
 */

export * as system from "./system";
export * as browsing from "./browsing";
export * as searching from "./searching";
export * as scanning from "./scanning";
export * as media from "./media";
export * as metadata from "./metadata";
export * as playlists from "./playlists";
export * as jobs from "./jobs";
export * as events from "./events";

export * from "./contracts";
export * from "./ports";
