import { afterEach, describe, expect, it, vi } from "vitest";
import { readStoredSort, writeStoredSort } from "./storedTrackSort";

const KEY = "wmm.themeTrackList.glass-player.library.sort";

function stubStorage(
  initial: Record<string, string> = {}
): Map<string, string> {
  const store = new Map(Object.entries(initial));
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  });
  return store;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("readStoredSort", () => {
  it("reads a stored sort", () => {
    stubStorage({ [KEY]: JSON.stringify({ column: "artist", desc: true }) });

    expect(readStoredSort(KEY)).toEqual({ column: "artist", desc: true });
  });

  it("reads a stored null as no sort", () => {
    stubStorage({ [KEY]: "null" });

    expect(readStoredSort(KEY)).toBeNull();
  });

  it("ignores invalid JSON", () => {
    stubStorage({ [KEY]: "{not json" });

    expect(readStoredSort(KEY)).toBeUndefined();
  });

  it("ignores an unknown column", () => {
    stubStorage({ [KEY]: JSON.stringify({ column: "gone", desc: false }) });

    expect(readStoredSort(KEY)).toBeUndefined();
  });

  it("ignores a desc that is not a boolean", () => {
    stubStorage({ [KEY]: JSON.stringify({ column: "title", desc: "yes" }) });

    expect(readStoredSort(KEY)).toBeUndefined();
  });

  it("returns undefined when nothing is stored", () => {
    stubStorage();

    expect(readStoredSort(KEY)).toBeUndefined();
  });

  it("returns undefined without a storage", () => {
    expect(readStoredSort(KEY)).toBeUndefined();
  });
});

describe("writeStoredSort", () => {
  it("stores the sort as JSON", () => {
    const store = stubStorage();

    writeStoredSort(KEY, { column: "duration", desc: false });

    expect(store.get(KEY)).toBe(
      JSON.stringify({ column: "duration", desc: false })
    );
  });

  it("stores null when the page has no sort", () => {
    const store = stubStorage();

    writeStoredSort(KEY, undefined);

    expect(store.get(KEY)).toBe("null");
  });

  it("ignores a storage that refuses the write", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
    });

    expect(() => {
      writeStoredSort(KEY, { column: "title", desc: false });
    }).not.toThrow();
  });
});
