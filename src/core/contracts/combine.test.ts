import { describe, it, expect } from "vitest";
import { mergeOrder, enabledSources, combineOrdered } from "./combine";
import type { MusicSource, RemoteSourceConfig } from "./sources";

function makeSource(
  overrides: Partial<
    Pick<MusicSource, "name" | "enabled" | "priority" | "uriDomain">
  > & {
    id: string;
    config?: RemoteSourceConfig;
  }
): MusicSource {
  return {
    id: overrides.id,
    name: overrides.name ?? overrides.id,
    uriDomain: overrides.uriDomain ?? "test",
    enabled: overrides.enabled ?? true,
    createdAt: new Date("2026-01-01"),
    priority: overrides.priority ?? 50,
    capabilities: {
      streaming: true,
      browsing: true,
      searching: false,
      metadataWrite: true,
      libraryScanning: true,
      playlistWrite: true,
    },
    kind: "subsonic",
    config: overrides.config ?? { baseUrl: "http://example.test" },
  };
}

describe("mergeOrder", () => {
  it("sorts by ascending priority, then id for ties", () => {
    const a = makeSource({ id: "b", name: "B", priority: 10 });
    const b = makeSource({ id: "a", name: "A", priority: 10 });
    const c = makeSource({ id: "c", name: "C", priority: 5 });
    expect(mergeOrder([a, b, c]).map((s) => s.id)).toEqual(["c", "a", "b"]);
  });

  it("does not mutate the input array", () => {
    const a = makeSource({ id: "a", name: "A", priority: 2 });
    const b = makeSource({ id: "b", name: "B", priority: 1 });
    const input = [a, b];
    mergeOrder(input);
    expect(input.map((s) => s.id)).toEqual(["a", "b"]);
  });
});

describe("enabledSources", () => {
  it("filters to enabled sources in merge order", () => {
    const on1 = makeSource({ id: "a", name: "A", priority: 2 });
    const off = makeSource({ id: "b", name: "B", priority: 1, enabled: false });
    const on2 = makeSource({ id: "c", name: "C", priority: 0 });
    expect(enabledSources([on1, off, on2]).map((s) => s.id)).toEqual([
      "c",
      "a",
    ]);
  });
});

describe("combineOrdered", () => {
  const src1 = makeSource({ id: "s1", name: "S1", priority: 5 });
  const src2 = makeSource({ id: "s2", name: "S2", priority: 1 });

  it("orders by source precedence (lower priority wins) and dedupes by key", () => {
    const out = combineOrdered(
      [
        { source: src1, items: [{ id: "x" }, { id: "y" }] },
        { source: src2, items: [{ id: "x" }, { id: "z" }] },
      ],
      (item) => item.id
    );
    expect(out.map((i) => i.id)).toEqual(["x", "z", "y"]);
  });

  it("keeps items from the higher-precedence source on collision", () => {
    const src1low = makeSource({ id: "s1", name: "S1", priority: 9 });
    const src2high = makeSource({ id: "s2", name: "S2", priority: 1 });
    const out = combineOrdered(
      [
        { source: src1low, items: [{ id: "same", val: "low" }] },
        { source: src2high, items: [{ id: "same", val: "high" }] },
      ],
      (i) => i.id
    );
    expect(out).toEqual([{ id: "same", val: "high" }]);
  });

  it("handles an empty source list", () => {
    expect(combineOrdered([], (i: { id: string }) => i.id)).toEqual([]);
  });
});
