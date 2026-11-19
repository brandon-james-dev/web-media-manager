import { describe, expect, it, vi } from "vitest";
import type { InstalledTheme } from "@/core/ports";
import { ActiveTheme } from "./activeTheme";

function theme(id: string, version = "1.0.0", installedAt = 1): InstalledTheme {
  return { id, name: id, version, installedAt } as InstalledTheme;
}

describe("ActiveTheme", () => {
  it("starts not loaded and without a theme", () => {
    const store = new ActiveTheme();
    expect(store.getSnapshot()).toEqual({ loaded: false, theme: undefined });
  });

  it("commits a loaded theme and notifies", async () => {
    const store = new ActiveTheme();
    const listener = vi.fn();
    store.subscribe(listener);

    await store.load(async () => theme("classic-blue"));

    expect(store.getSnapshot().loaded).toBe(true);
    expect(store.getSnapshot().theme?.id).toBe("classic-blue");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("keeps the latest load when an older one resolves later", async () => {
    const store = new ActiveTheme();
    let releaseFirst: (value: InstalledTheme | undefined) => void = () => {};
    const first = store.load(
      () =>
        new Promise<InstalledTheme | undefined>((resolve) => {
          releaseFirst = resolve;
        })
    );
    await store.load(async () => theme("second"));

    releaseFirst(theme("first"));
    await first;

    expect(store.getSnapshot().theme?.id).toBe("second");
  });

  it("reports a rejection as loaded with no theme", async () => {
    const store = new ActiveTheme();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const listener = vi.fn();
    store.subscribe(listener);

    await store.load(async () => {
      throw new Error("store unavailable");
    });

    expect(store.getSnapshot()).toEqual({ loaded: true, theme: undefined });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("does not notify when the same theme reloads", async () => {
    const store = new ActiveTheme();
    await store.load(async () => theme("classic-blue"));
    const listener = vi.fn();
    store.subscribe(listener);

    await store.load(async () => theme("classic-blue"));

    expect(listener).not.toHaveBeenCalled();
  });
});
