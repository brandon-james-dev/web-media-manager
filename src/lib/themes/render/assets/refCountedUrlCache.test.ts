import { describe, expect, it, vi } from "vitest";
import { RefCountedUrlCache } from "./refCountedUrlCache";

function createCache(): {
  cache: RefCountedUrlCache;
  created: string[];
  revoked: string[];
} {
  const created: string[] = [];
  const revoked: string[] = [];
  let next = 0;
  const cache = new RefCountedUrlCache(
    (bytes, mimeType) => {
      next += 1;
      const url = `blob:test/${next}/${bytes.length}/${mimeType}`;
      created.push(url);
      return url;
    },
    (url) => revoked.push(url)
  );
  return { cache, created, revoked };
}

const bytes = new Uint8Array([1, 2, 3]);

describe("RefCountedUrlCache", () => {
  it("loads once for concurrent acquires of one key", async () => {
    const { cache, created } = createCache();
    const load = vi.fn(async () => ({ bytes, mimeType: "image/png" }));
    const [first, second] = await Promise.all([
      cache.acquire("logo", load),
      cache.acquire("logo", load),
    ]);
    expect(first).toBe(second);
    expect(load).toHaveBeenCalledTimes(1);
    expect(created).toHaveLength(1);
  });

  it("reuses the URL for a later acquire", async () => {
    const { cache, created } = createCache();
    const first = await cache.acquire("logo", async () => ({
      bytes,
      mimeType: "image/png",
    }));
    const second = await cache.acquire("logo", async () => ({
      bytes,
      mimeType: "image/png",
    }));
    expect(second).toBe(first);
    expect(created).toHaveLength(1);
  });

  it("revokes only when the last holder releases", async () => {
    const { cache, revoked } = createCache();
    const url = await cache.acquire("logo", async () => ({
      bytes,
      mimeType: "image/png",
    }));
    await cache.acquire("logo", async () => ({ bytes, mimeType: "image/png" }));
    cache.release("logo");
    expect(revoked).toEqual([]);
    expect(cache.peek("logo")).toBe(url);
    cache.release("logo");
    expect(revoked).toEqual([url]);
    expect(cache.peek("logo")).toBeUndefined();
  });

  it("revokes everything on releaseAll", async () => {
    const { cache, revoked } = createCache();
    const first = await cache.acquire("a", async () => ({
      bytes,
      mimeType: "image/png",
    }));
    const second = await cache.acquire("b", async () => ({
      bytes,
      mimeType: "image/svg+xml",
    }));
    cache.releaseAll();
    expect(revoked).toEqual([first, second]);
    expect(cache.peek("a")).toBeUndefined();
    expect(cache.peek("b")).toBeUndefined();
  });

  it("caches nothing when the load yields nothing", async () => {
    const { cache, created } = createCache();
    const url = await cache.acquire("missing", async () => undefined);
    expect(url).toBeUndefined();
    expect(created).toEqual([]);
    expect(cache.peek("missing")).toBeUndefined();
  });

  it("ignores a release of an unknown key", () => {
    const { cache, revoked } = createCache();
    cache.release("unknown");
    expect(revoked).toEqual([]);
  });
});
