import { describe, expect, it, vi } from "vitest";
import type { LyricsResult } from "@/core/contracts";
import { createLyricsProviderRegistry } from "./createLyricsProviderRegistry";

function result(overrides: Partial<LyricsResult> = {}): LyricsResult {
  return {
    source: "alpha",
    title: "Amarillo by Morning",
    artist: "George Strait",
    ...overrides,
  };
}

describe("createLyricsProviderRegistry", () => {
  it("lists providers sorted by display name", () => {
    const registry = createLyricsProviderRegistry();
    registry.registerProvider(
      { id: "zeta", name: "Zeta", origin: "builtin" },
      () => ({ provider: "zeta", search: async () => null })
    );
    registry.registerProvider(
      { id: "alpha", name: "Alpha", origin: "plugin", pluginId: "alpha-plugin" },
      () => ({ provider: "alpha", search: async () => null })
    );

    expect(registry.listProviders().map((provider) => provider.id)).toEqual([
      "alpha",
      "zeta",
    ]);
  });

  it("keeps the snapshot identity until the set changes", () => {
    const registry = createLyricsProviderRegistry();
    registry.registerProvider(
      { id: "alpha", name: "Alpha", origin: "builtin" },
      () => ({ provider: "alpha", search: async () => null })
    );

    const first = registry.listProviders();
    expect(registry.listProviders()).toBe(first);

    registry.registerProvider(
      { id: "beta", name: "Beta", origin: "builtin" },
      () => ({ provider: "beta", search: async () => null })
    );
    expect(registry.listProviders()).not.toBe(first);
  });

  it("builds a service with the config it is given", async () => {
    const registry = createLyricsProviderRegistry();
    const search = vi.fn(async (_query: unknown) => [result()]);
    registry.registerProvider(
      { id: "alpha", name: "Alpha", origin: "builtin" },
      (config) => ({
        provider: "alpha",
        search: async (query) => {
          expect(config.applicationId).toBe("app-id");
          return search(query);
        },
      })
    );

    const service = registry.getService("alpha", { applicationId: "app-id" });
    const results = await service?.search({ title: "x", artist: "y" });

    expect(search).toHaveBeenCalledOnce();
    expect(results).toEqual([result()]);
  });

  it("returns null for an unknown provider", () => {
    const registry = createLyricsProviderRegistry();
    expect(registry.getService("missing")).toBeNull();
    expect(registry.getProvider("missing")).toBeUndefined();
  });

  it("notifies subscribers on register and unregister", () => {
    const registry = createLyricsProviderRegistry();
    const listener = vi.fn();
    const unsubscribe = registry.subscribe(listener);

    registry.registerProvider(
      { id: "alpha", name: "Alpha", origin: "builtin" },
      () => ({ provider: "alpha", search: async () => null })
    );
    registry.unregisterProvider("alpha");
    registry.unregisterProvider("alpha");

    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    registry.registerProvider(
      { id: "beta", name: "Beta", origin: "builtin" },
      () => ({ provider: "beta", search: async () => null })
    );
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("replaces a provider registered under the same id", () => {
    const registry = createLyricsProviderRegistry();
    registry.registerProvider(
      { id: "alpha", name: "Alpha", origin: "builtin" },
      () => ({ provider: "alpha", search: async () => null })
    );
    registry.registerProvider(
      { id: "alpha", name: "Alpha Two", origin: "plugin", pluginId: "p" },
      () => ({ provider: "alpha", search: async () => null })
    );

    expect(registry.listProviders()).toHaveLength(1);
    expect(registry.getProvider("alpha")?.name).toBe("Alpha Two");
  });
});
