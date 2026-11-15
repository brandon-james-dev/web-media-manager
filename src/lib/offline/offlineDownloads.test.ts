import { beforeEach, describe, expect, it } from "vitest";
import {
  advanceOfflineBatch,
  clearOfflineBatch,
  completeOfflineBatch,
  getOfflineDownloadSnapshot,
  isSongDownloading,
  onOfflineDownloadsChanged,
  resetOfflineBatches,
  startOfflineBatch,
} from "./offlineDownloads";

/**
 * An album card reads its download progress from this store, so the counts it
 * reports have to be exact: a ring that stops short of the total, or a batch
 * that never completes, leaves the card stuck mid-download.
 */

describe("offline download batches", () => {
  beforeEach(() => {
    resetOfflineBatches();
  });

  it("starts at zero of the batch size", () => {
    startOfflineBatch("album:A", ["1", "2", "3"]);

    const batch = getOfflineDownloadSnapshot().get("album:A");

    expect(batch?.completed).toBe(0);
    expect(batch?.total).toBe(3);
    expect(batch?.state).toBe("running");
  });

  it("counts each finished song", () => {
    startOfflineBatch("album:A", ["1", "2", "3"]);

    advanceOfflineBatch("album:A");
    advanceOfflineBatch("album:A");

    expect(getOfflineDownloadSnapshot().get("album:A")?.completed).toBe(2);
  });

  it("never counts past the total", () => {
    startOfflineBatch("album:A", ["1"]);

    advanceOfflineBatch("album:A");
    advanceOfflineBatch("album:A");

    expect(getOfflineDownloadSnapshot().get("album:A")?.completed).toBe(1);
  });

  it("marks a finished batch complete and stamps the time", () => {
    startOfflineBatch("album:A", ["1", "2"]);
    advanceOfflineBatch("album:A");

    completeOfflineBatch("album:A");

    const batch = getOfflineDownloadSnapshot().get("album:A");

    expect(batch?.state).toBe("completed");
    expect(batch?.completed).toBe(2);
    expect(typeof batch?.finishedAt).toBe("number");
  });

  it("ignores advances after completion", () => {
    startOfflineBatch("album:A", ["1"]);
    completeOfflineBatch("album:A");

    advanceOfflineBatch("album:A");

    expect(getOfflineDownloadSnapshot().get("album:A")?.completed).toBe(1);
  });

  it("notifies subscribers on every change", () => {
    let changes = 0;
    const unsubscribe = onOfflineDownloadsChanged(() => {
      changes += 1;
    });

    startOfflineBatch("album:A", ["1", "2"]);
    advanceOfflineBatch("album:A");
    completeOfflineBatch("album:A");
    clearOfflineBatch("album:A");

    unsubscribe();

    expect(changes).toBe(4);
    expect(getOfflineDownloadSnapshot().has("album:A")).toBe(false);
  });

  it("hands out a new snapshot per change so React re-renders", () => {
    startOfflineBatch("album:A", ["1"]);
    const first = getOfflineDownloadSnapshot();

    advanceOfflineBatch("album:A");

    expect(getOfflineDownloadSnapshot()).not.toBe(first);
  });

  it("reports a song as downloading until its own advance lands", () => {
    startOfflineBatch("album:A", ["1", "2"]);

    expect(isSongDownloading("1")).toBe(true);
    expect(isSongDownloading("2")).toBe(true);

    advanceOfflineBatch("album:A", "1");

    expect(isSongDownloading("1")).toBe(false);
    expect(isSongDownloading("2")).toBe(true);
  });

  it("stops reporting a song once the batch completes", () => {
    startOfflineBatch("album:A", ["1"]);
    completeOfflineBatch("album:A");

    expect(isSongDownloading("1")).toBe(false);
  });

  it("ignores songs outside the batch", () => {
    startOfflineBatch("album:A", ["1"]);

    expect(isSongDownloading("9")).toBe(false);
  });
});
