import { describe, expect, it, vi } from "vitest";

/**
 * One unreadable source must not abort the boot resync.
 *
 * A Zune that was unplugged throws `NotFoundError: The device was
 * disconnected` from `refreshSource`. Letting that escape rejected
 * `resyncAllSources`, which runs unawaited at boot, so `main.tsx` painted the
 * boot-failure screen over the app and no later source was resynced either.
 */

const sources = [
  { id: "zune-120", kind: "sync", name: "Zune 120" },
  { id: "local-1", kind: "local", name: "Music" },
];

const synced: string[] = [];

vi.mock("@/core/ports", () => ({
  getSourcesStore: () => ({ getSources: async () => sources }),
}));

vi.mock("./index", () => ({
  allMusicSourceStrategies: [
    {
      kind: "sync",
      sync: async () => {
        throw new DOMException(
          "Failed to execute 'open' on 'USBDevice': The device was disconnected.",
          "NotFoundError"
        );
      },
    },
    {
      kind: "local",
      sync: async () => {
        synced.push("local-1");
        return null;
      },
    },
  ],
}));

const { resyncAllSources } = await import("./resync");

describe("resyncAllSources", () => {
  it("keeps resyncing other sources when one device is unplugged", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await expect(resyncAllSources()).resolves.toBeUndefined();

    expect(synced).toEqual(["local-1"]);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Could not resync "Zune 120"'),
      expect.anything()
    );

    warn.mockRestore();
  });

  it("skips sources named in skipSourceIds", async () => {
    synced.length = 0;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await resyncAllSources(new Set(["local-1"]));

    expect(synced).toEqual([]);

    warn.mockRestore();
  });
});
