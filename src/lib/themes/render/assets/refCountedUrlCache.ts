/**
 * A URL cache that counts its users, so a Blob URL is revoked only when the
 * last holder releases it. Concurrent acquires of one key share a single
 * load.
 *
 * @example
 * ```xml
 * <Image id="play-orb" src="assets/images/play-orb.png" />
 * ```
 * @example
 * ```ts
 * const cache = new RefCountedUrlCache(
 *   (bytes, mimeType) =>
 *     URL.createObjectURL(new Blob([bytes], { type: mimeType })),
 *   (url) => URL.revokeObjectURL(url)
 * );
 * ```
 */
export class RefCountedUrlCache {
  private readonly create: (bytes: Uint8Array, mimeType: string) => string;
  private readonly revoke: (url: string) => void;
  private readonly entries = new Map<string, { url: string; count: number }>();
  private readonly pending = new Map<string, Promise<string | undefined>>();

  constructor(
    create: (bytes: Uint8Array, mimeType: string) => string,
    revoke: (url: string) => void
  ) {
    this.create = create;
    this.revoke = revoke;
  }

  /**
   * Returns the URL of a key, loading it on first use and incrementing its
   * count. A load that yields nothing returns `undefined` and caches
   * nothing.
   *
   * @example
   * ```xml
   * <Image id="logo" src="assets/images/logo.svg" />
   * ```
   * @example
   * ```ts
   * const url = await cache.acquire("logo", () =>
   *   readFile("logo").then((bytes) =>
   *     bytes === undefined ? undefined : { bytes, mimeType: "image/svg+xml" }
   *   )
   * );
   * ```
   */
  async acquire(
    key: string,
    load: () => Promise<{ bytes: Uint8Array; mimeType: string } | undefined>
  ): Promise<string | undefined> {
    const existing = this.entries.get(key);
    if (existing !== undefined) {
      existing.count += 1;
      return existing.url;
    }

    const pending = this.pending.get(key);
    if (pending !== undefined) {
      const url = await pending;
      if (url === undefined) return undefined;
      const entry = this.entries.get(key);
      if (entry !== undefined) entry.count += 1;
      return url;
    }

    const promise = (async (): Promise<string | undefined> => {
      const loaded = await load();
      if (loaded === undefined) return undefined;
      const url = this.create(loaded.bytes, loaded.mimeType);
      this.entries.set(key, { url, count: 1 });
      return url;
    })();
    this.pending.set(key, promise);
    try {
      return await promise;
    } finally {
      this.pending.delete(key);
    }
  }

  /**
   * Drops one holder of a key and revokes its URL when the count reaches
   * zero.
   *
   * @example
   * ```xml
   * <Image id="logo" src="assets/images/logo.svg" />
   * ```
   * @example
   * ```ts
   * cache.release("logo");
   * cache.peek("logo"); // undefined
   * ```
   */
  release(key: string): void {
    const entry = this.entries.get(key);
    if (entry === undefined) return;
    entry.count -= 1;
    if (entry.count > 0) return;
    this.entries.delete(key);
    this.revoke(entry.url);
  }

  /**
   * Revokes every URL the cache holds, whatever its count.
   *
   * @example
   * ```xml
   * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
   * ```
   * @example
   * ```ts
   * cache.releaseAll();
   * cache.peek("logo"); // undefined
   * ```
   */
  releaseAll(): void {
    for (const entry of this.entries.values()) this.revoke(entry.url);
    this.entries.clear();
  }

  /**
   * The URL of a key without acquiring it.
   *
   * @example
   * ```xml
   * <Image id="logo" src="assets/images/logo.svg" />
   * ```
   * @example
   * ```ts
   * cache.peek("logo"); // "blob:http://localhost/1a2b"
   * ```
   */
  peek(key: string): string | undefined {
    return this.entries.get(key)?.url;
  }
}
