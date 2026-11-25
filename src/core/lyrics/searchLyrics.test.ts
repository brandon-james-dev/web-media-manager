import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LyricsResult } from "@/core/contracts";
import {
  setLyricsProviderRegistryProvider,
  setLyricsSettingsStoreProvider,
} from "@/core/ports";
import { createLyricsProviderRegistry } from "./createLyricsProviderRegistry";
import { searchLyrics } from "./searchLyrics";

const result: LyricsResult = {
  source: "alpha",
  title: "Amarillo by Morning",
  artist: "George Strait",
};

function registerAlpha(
  search: (query: unknown) => Promise<LyricsResult[] | null>
): void {
  const registry = createLyricsProviderRegistry();
  registry.registerProvider(
    { id: "alpha", name: "Alpha", origin: "builtin" },
    () => ({ provider: "alpha", search: search as never })
  );
  setLyricsProviderRegistryProvider(() => registry);
}

beforeEach(() => {
  setLyricsSettingsStoreProvider(() => ({
    getSettings: async () => ({}),
    setApplicationId: async () => {},
    saveSettings: async () => {},
  }));
});

describe("searchLyrics", () => {
  it("searches the registered provider", async () => {
    const search = vi.fn(async () => [result]);
    registerAlpha(search);

    await expect(
      searchLyrics("alpha", { title: "Amarillo by Morning", artist: "George Strait" })
    ).resolves.toEqual([result]);
    expect(search).toHaveBeenCalledOnce();
  });

  it("passes the saved application id to the provider", async () => {
    setLyricsSettingsStoreProvider(() => ({
      getSettings: async () => ({ applicationId: "app-id" }),
      setApplicationId: async () => {},
      saveSettings: async () => {},
    }));

    const registry = createLyricsProviderRegistry();
    const seen: Array<string | undefined> = [];
    registry.registerProvider(
      { id: "alpha", name: "Alpha", origin: "builtin" },
      (config) => {
        seen.push(config.applicationId);
        return { provider: "alpha", search: async () => null };
      }
    );
    setLyricsProviderRegistryProvider(() => registry);

    await searchLyrics("alpha", { title: "x", artist: "y" });

    expect(seen).toEqual(["app-id"]);
  });

  it("still searches when the settings store is unavailable", async () => {
    setLyricsSettingsStoreProvider(() => {
      throw new Error("no store");
    });
    const search = vi.fn(async () => [result]);
    registerAlpha(search);

    await expect(
      searchLyrics("alpha", { title: "x", artist: "y" })
    ).resolves.toEqual([result]);
  });

  it("throws for a provider that is no longer registered", async () => {
    registerAlpha(async () => null);

    await expect(
      searchLyrics("missing", { title: "x", artist: "y" })
    ).rejects.toThrow('Unknown lyrics provider "missing".');
  });
});
