import { describe, expect, it, vi } from "vitest";
import { runSourceRefresh } from "./runSourceRefresh";

/**
 * A refresh that throws must release the syncing flag.
 *
 * The sources page cleared the flag only on success, so one failure left the
 * source permanently "syncing" and every later click returned early with no
 * console output at all — the button looked dead.
 */
describe("runSourceRefresh", () => {
  it("releases the flag when the refresh throws", async () => {
    let syncingId: string | null = null;

    const ran = await runSourceRefresh({
      syncingId,
      sourceId: "zune-120",
      sourceName: "Zune 120",
      onStart: (id) => {
        syncingId = id;
      },
      onFinish: () => {
        syncingId = null;
      },
      refresh: async () => {
        throw new Error("device unplugged");
      },
      log: { debug: () => undefined, warn: () => undefined, error: () => undefined },
    });

    expect(ran).toBe(true);
    expect(syncingId).toBeNull();
  });

  it("says so instead of returning silently when a source is still syncing", async () => {
    const warn = vi.fn();
    const refresh = vi.fn();

    const ran = await runSourceRefresh({
      syncingId: "zune-8",
      sourceId: "zune-120",
      sourceName: "Zune 120",
      onStart: () => undefined,
      onFinish: () => undefined,
      refresh,
      log: { debug: () => undefined, warn, error: () => undefined },
    });

    expect(ran).toBe(false);
    expect(refresh).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('"zune-8" is still marked as syncing')
    );
  });

  it("releases the flag on success", async () => {
    let syncingId: string | null = null;

    const ran = await runSourceRefresh({
      syncingId,
      sourceId: "zune-120",
      sourceName: "Zune 120",
      onStart: (id) => {
        syncingId = id;
      },
      onFinish: () => {
        syncingId = null;
      },
      refresh: async () => undefined,
      log: { debug: () => undefined, warn: () => undefined, error: () => undefined },
    });

    expect(ran).toBe(true);
    expect(syncingId).toBeNull();
  });
});
