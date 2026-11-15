import { beforeEach, describe, expect, it, vi } from "vitest";

const listOfflineSongIds = vi.fn(async () => ["cached-1"]);
const getSources = vi.fn(async () => [
  { id: "local-a", kind: "local" },
  { id: "sync-a", kind: "sync" },
  { id: "sub-a", kind: "subsonic" },
]);
const getAll = vi.fn(async () => [
  { id: "local-song", sourceId: "local-a" },
  { id: "device-song", sourceId: "sync-a" },
  { id: "remote-song", sourceId: "sub-a" },
]);

vi.mock("./offlineAudioStore", () => ({
  listOfflineSongIds,
  onOfflineAudioChanged: () => () => undefined,
}));

vi.mock("@/core/ports", () => ({
  getSourcesStore: () => ({ getSources }),
  getStore: () => ({ getAll }),
}));

const {
  getOfflineSongIdsSnapshot,
  isAlwaysOfflineKind,
  isSongOffline,
  reloadOfflineSongIds,
  resetOfflineSongIds,
} = await import("./offlineSongIds");

/**
 * The snapshot answers "is this song's audio on this device?" for the Offline
 * column, its sort, and the sync queue's drop gate. A local song missing from
 * it was refused as "not offline" and could never be queued for a device.
 */

describe("offline song ids", () => {
  beforeEach(() => {
    resetOfflineSongIds();
    listOfflineSongIds.mockClear();
    getSources.mockClear();
    getAll.mockClear();
  });

  it("counts a cached song as available", async () => {
    await reloadOfflineSongIds();

    expect(isSongOffline("cached-1")).toBe(true);
  });

  it("counts a local or sync source's songs as available without a cache", async () => {
    await reloadOfflineSongIds();

    expect(isSongOffline("local-song")).toBe(true);
    expect(isSongOffline("device-song")).toBe(true);
  });

  it("leaves a remote song unavailable until it is cached", async () => {
    await reloadOfflineSongIds();

    expect(isSongOffline("remote-song")).toBe(false);
  });

  it("keeps the cached ids when the store is not wired", async () => {
    getSources.mockRejectedValueOnce(new Error("no store"));

    await reloadOfflineSongIds();

    expect([...getOfflineSongIdsSnapshot()]).toEqual(["cached-1"]);
  });

  it("treats only local and sync kinds as always offline", () => {
    expect(isAlwaysOfflineKind("local")).toBe(true);
    expect(isAlwaysOfflineKind("sync")).toBe(true);
    expect(isAlwaysOfflineKind("subsonic")).toBe(false);
    expect(isAlwaysOfflineKind(undefined)).toBe(false);
  });
});
