import { describe, expect, it } from "vitest";

import { wmmBus } from "@/events";
import "./playlist-import-events";

const progress = (data: object, parentJobId?: string) =>
  wmmBus.publish("wmm.jobs.state", {
    state: "progress",
    jobId: "j",
    jobType: "Bulk Import",
    parentJobId,
    payload: { data },
  });

describe("playlist import event bridge", () => {
  it("publishes wmm.playlists.imported when the playlist phase finishes", () => {
    const seen: unknown[] = [];
    const off = wmmBus.on("wmm.playlists.imported", (e) => seen.push(e));

    progress({ phase: "playlists", sourceId: "s" }); // mid-phase: ignored
    progress({ phase: "songs", done: true, sourceId: "s" }); // wrong phase
    progress({
      phase: "playlists",
      done: true,
      sourceId: "s",
      playlistIds: ["a"],
      removedIds: ["b"],
    });
    off();

    expect(seen).toEqual([
      { sourceId: "s", playlistIds: ["a"], removedIds: ["b"] },
    ]);
  });
});
