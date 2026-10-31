import { describe, expect, it, vi } from "vitest";

import type { MusicSourceRepository } from "@/core/ports/sources";
import type { MusicSource } from "@/core/contracts";

function makeSource(partial: Partial<MusicSource> = {}): MusicSource {
  const id = partial.id ?? "src-1";
  return {
    id,
    name: `Source ${id}`,
    uriDomain: partial.uriDomain ?? id,
    enabled: true,
    createdAt: new Date("2026-01-01"),
    priority: 50,
    capabilities: {
      streaming: true,
      browsing: true,
      searching: true,
      metadataWrite: false,
      libraryScanning: false,
    },
    kind: "local",
    ...(partial.kind === "subsonic"
      ? {
          config: { baseUrl: "https://example.com", username: "u" },
        }
      : {}),
    ...partial,
  } as MusicSource;
}

/** In-memory MusicSourceRepository conforming to the port contract. */
class FakeSourceRepository implements MusicSourceRepository {
  private sources = new Map<string, MusicSource>();
  private added = new Set<(s: MusicSource) => void>();
  private deleted = new Set<(s: MusicSource) => void>();
  private cleared = new Set<() => void>();

  async getSources(): Promise<MusicSource[]> {
    return [...this.sources.values()].sort((a, b) => a.priority - b.priority);
  }

  async addSource(source: MusicSource): Promise<MusicSource> {
    this.sources.set(source.id, source);
    this.added.forEach((cb) => cb(source));
    return source;
  }

  async deleteSource(id: string): Promise<void> {
    const existing = this.sources.get(id);
    if (!existing) return;
    this.sources.delete(id);
    this.deleted.forEach((cb) => cb(existing));
  }

  async clear(): Promise<void> {
    this.sources.clear();
    this.cleared.forEach((cb) => cb());
  }

  onSourceAdded(cb: (s: MusicSource) => void): () => void {
    this.added.add(cb);
    return () => this.added.delete(cb);
  }
  onSourceDeleted(cb: (s: MusicSource) => void): () => void {
    this.deleted.add(cb);
    return () => this.deleted.delete(cb);
  }
  onSourcesCleared(cb: () => void): () => void {
    this.cleared.add(cb);
    return () => this.cleared.delete(cb);
  }
}

describe("MusicSourceRepository (port contract)", () => {
  it("lists sources in ascending priority order (merge order)", async () => {
    const repo = new FakeSourceRepository();
    await repo.addSource(makeSource({ id: "a", priority: 60 }));
    await repo.addSource(makeSource({ id: "b", priority: 30 }));
    await repo.addSource(makeSource({ id: "c", priority: 50 }));

    const sources = await repo.getSources();
    expect(sources.map((s) => s.id)).toEqual(["b", "c", "a"]);
  });

  it("adds a source and notifies onSourceAdded subscribers", async () => {
    const repo = new FakeSourceRepository();
    const onAdded = vi.fn();
    repo.onSourceAdded(onAdded);

    const source = makeSource({ id: "local-1", kind: "local" });
    await repo.addSource(source);

    expect(await repo.getSources()).toHaveLength(1);
    expect(onAdded).toHaveBeenCalledWith(source);
  });

  it("deletes a source and notifies onSourceDeleted; missing id is a no-op", async () => {
    const repo = new FakeSourceRepository();
    const onDeleted = vi.fn();
    repo.onSourceDeleted(onDeleted);

    await repo.addSource(makeSource({ id: "a" }));
    await repo.deleteSource("missing");
    expect(onDeleted).not.toHaveBeenCalled();

    await repo.deleteSource("a");
    expect(onDeleted).toHaveBeenCalledTimes(1);
    expect(await repo.getSources()).toHaveLength(0);
  });

  it("clear() notifies onSourcesCleared and empties the list", async () => {
    const repo = new FakeSourceRepository();
    const onCleared = vi.fn();
    repo.onSourcesCleared(onCleared);

    await repo.addSource(makeSource({ id: "a" }));
    await repo.addSource(makeSource({ id: "b" }));
    await repo.clear();

    expect(onCleared).toHaveBeenCalledTimes(1);
    expect(await repo.getSources()).toHaveLength(0);
  });

  it("supports source instances of different kinds with distinct ids", async () => {
    const repo = new FakeSourceRepository();
    const local = await repo.addSource(makeSource({ id: "local", kind: "local" }));
    const sub1 = await repo.addSource(
      makeSource({ id: "sub-1", kind: "subsonic", name: "Navidrome" })
    );
    const sub2 = await repo.addSource(
      makeSource({ id: "sub-2", kind: "subsonic", name: "Gonic" })
    );

    expect(await repo.getSources()).toHaveLength(3);
    expect(local.kind).toBe("local");
    expect(sub1.kind).toBe("subsonic");
    expect(sub2.kind).toBe("subsonic");
    // distinct ids mean two subsonic instances coexist
    expect(sub1.id).not.toBe(sub2.id);
  });

  it("unsubscribes onSourceAdded when the returned function is called", async () => {
    const repo = new FakeSourceRepository();
    const onAdded = vi.fn();
    const off = repo.onSourceAdded(onAdded);

    off();
    await repo.addSource(makeSource({ id: "a" }));
    expect(onAdded).not.toHaveBeenCalled();
  });
});
