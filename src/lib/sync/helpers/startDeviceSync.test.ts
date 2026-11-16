import { describe, expect, it, vi } from "vitest";
import type { SyncDevice } from "@/models";
import { startDeviceSync } from "./startDeviceSync";

const device = { id: "zune-120", name: "Zune 120" } as SyncDevice;

function deps(overrides: Partial<Parameters<typeof startDeviceSync>[1]> = {}) {
  return {
    findDevice: () => device,
    syncQueue: vi.fn(async () => undefined),
    onStarted: vi.fn(),
    onMissingDevice: vi.fn(),
    onFailed: vi.fn(),
    ...overrides,
  };
}

describe("startDeviceSync", () => {
  it("reports a device that is no longer in the list", () => {
    const d = deps({ findDevice: () => undefined });

    startDeviceSync("zune-120", d);

    expect(d.onMissingDevice).toHaveBeenCalledWith("zune-120");
    expect(d.syncQueue).not.toHaveBeenCalled();
  });

  it("reports a sync that throws instead of swallowing it", async () => {
    const error = new Error("playlists unavailable");
    const d = deps({
      syncQueue: vi.fn(async () => {
        throw error;
      }),
    });

    startDeviceSync("zune-120", d);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(d.onFailed).toHaveBeenCalledWith("zune-120", error);
    expect(d.onStarted).not.toHaveBeenCalled();
  });

  it("reports a sync that started", async () => {
    const d = deps();

    startDeviceSync("zune-120", d);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(d.onStarted).toHaveBeenCalledWith(device);
    expect(d.onFailed).not.toHaveBeenCalled();
  });
});
