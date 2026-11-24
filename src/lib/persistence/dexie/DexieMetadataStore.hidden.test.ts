import { describe, expect, it, vi } from "vitest";
import { DexieMetadataStore } from "./DexieMetadataStore";
import type { WmmMusicDb } from "./WmmMusicDb";
import type { Song } from "@/models";

const songs = [
  { id: "s1", title: "Alpha" },
  { id: "s2", title: "Beta" },
  { id: "s3", title: "Gamma" },
] as Song[];

const hiddenIds = ["s2"];

/**
 * A minimal stand-in for the Dexie database: the songs table the store reads
 * and the hidden table it has to consult.
 */
function fakeDb() {
  return {
    songs: {
      count: vi.fn(async () => songs.length),
      toArray: vi.fn(async () => [...songs]),
    },
    hiddenTracks: {
      toCollection: () => ({
        primaryKeys: vi.fn(async () => [...hiddenIds]),
      }),
    },
  } as unknown as WmmMusicDb;
}

/**
 * Hiding a track is a library-level rule, not a view concern: the store's
 * filter is what every list goes through, so a hidden song must not come back
 * from it unless the caller explicitly asks for hidden songs.
 */
describe("DexieMetadataStore.filter and hidden tracks", () => {
  it("leaves a hidden song out of the result", async () => {
    const store = new DexieMetadataStore(fakeDb());

    const result = await store.filter({});

    expect(result.data.map((song) => song.id)).toEqual(["s1", "s3"]);
    expect(result.filteredCount).toBe(2);
  });

  it("returns hidden songs when the query asks for them", async () => {
    const store = new DexieMetadataStore(fakeDb());

    const result = await store.filter({ includeHidden: true });

    expect(result.data.map((song) => song.id)).toEqual(["s1", "s2", "s3"]);
    expect(result.filteredCount).toBe(3);
  });

  it("keeps the caller's own filter alongside the hidden rule", async () => {
    const store = new DexieMetadataStore(fakeDb());

    const result = await store.filter({
      filter: (song) => song.title?.startsWith("G") ?? false,
    });

    expect(result.data.map((song) => song.id)).toEqual(["s3"]);
  });
});
