import { describe, expect, it } from "vitest";
import { syncTrackToSong } from "./useSourceSongs";

describe("syncTrackToSong", () => {
  it("converts the device's millisecond length to seconds", () => {
    // 214805 ms is 3:34 — passing milliseconds through rendered "3580:05".
    const song = syncTrackToSong("dev-1", {
      id: 7,
      title: "Just to See You Smile",
      durationMs: 214_805,
    });

    expect(song.duration).toBeCloseTo(214.805, 3);
  });

  it("leaves the duration undefined when the device has none", () => {
    expect(syncTrackToSong("dev-1", { id: 1 }).duration).toBeUndefined();
  });

  it("maps the remaining tag fields onto the song", () => {
    const song = syncTrackToSong("dev-1", {
      id: 21,
      title: "21 Guns",
      artist: "Green Day",
      album: "21 Guns - Single",
      genre: "Alternative",
      year: 2009,
      trackNumber: 1,
      trackTotal: 2,
      discNumber: 1,
      discTotal: 1,
      bitrate: 320,
      durationMs: 322_000,
    });

    expect(song).toMatchObject({
      id: "dev-1:21",
      sourceId: "dev-1",
      title: "21 Guns",
      artist: "Green Day",
      album: "21 Guns - Single",
      genre: "Alternative",
      year: 2009,
      track: 1,
      totalTracks: 2,
      discNumber: 1,
      totalDiscs: 1,
      bitrate: 320,
      duration: 322,
    });
  });

  it("namespaces the id by device so it cannot collide with a library song", () => {
    expect(syncTrackToSong("a", { id: 1 }).id).not.toBe(
      syncTrackToSong("b", { id: 1 }).id
    );
  });

  it("carries the device file size so the list can total it", () => {
    const song = syncTrackToSong("dev-1", { id: 1, fileSize: 5_242_880 });

    expect(song.filesize).toBe(5_242_880);
  });

  it("reports zero size when the device has none", () => {
    expect(syncTrackToSong("dev-1", { id: 1 }).filesize).toBe(0);
  });
});
