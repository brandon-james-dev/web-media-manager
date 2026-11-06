import { wmmBus } from "@/events";

// Bridges the bulk-import job's playlist phase into a domain event. The
// import runs in a worker, whose store writes never reach main-thread
// listeners, so the worker's final playlist progress report (`data.done`)
// is what tells the app that playlists changed.
wmmBus.on("wmm.jobs.state", (evt) => {
  if (!evt || evt.state !== "progress" || evt.parentJobId) return;
  if (evt.jobType !== "Bulk Import") return;

  const data = (evt.payload as { data?: Record<string, unknown> } | undefined)
    ?.data;
  if (data?.phase !== "playlists" || !data.done) return;

  wmmBus.publish("wmm.playlists.imported", {
    sourceId: String(data.sourceId),
    playlistIds: (data.playlistIds as string[]) ?? [],
    removedIds: (data.removedIds as string[]) ?? [],
  });
});
