import { mimeTypeOf } from "@/lib/packages";
import type { IRImage, IRNode, IRValue, ThemeIR } from "../../../ir";
import { escapeUrl } from "../../styles/serializeValues";
import type {
  ResolvedThemeImage,
  ThemeImageResolver,
} from "../../styles/types";
import { RefCountedUrlCache } from "../refCountedUrlCache";

/**
 * Turns a theme package's image files into ref-counted Blob URLs and decodes
 * their natural size, so the style engine can write `image-set()` values and
 * natural button sizes.
 *
 * @example
 * ```xml
 * <Image id="play-orb" src="assets/images/play-orb.png">
 *   <Variant scale="2" src="assets/images/play-orb@2x.png" />
 * </Image>
 * ```
 * @example
 * ```ts
 * const assets = new ThemeImageAssets((themeId, path) =>
 *   getThemeStore().files.getFile(themeId, path).then((file) => file?.bytes)
 * );
 * const images = await assets.preload(ir);
 * ```
 */
export class ThemeImageAssets {
  private readonly readFile: (
    themeId: string,
    path: string
  ) => Promise<Uint8Array | undefined>;
  private readonly cache: RefCountedUrlCache;
  private readonly resolved = new Map<string, ResolvedThemeImage>();
  private readonly warned = new Set<string>();
  private loadedKey: string | undefined;

  constructor(
    readFile: (themeId: string, path: string) => Promise<Uint8Array | undefined>
  ) {
    this.readFile = readFile;
    this.cache = new RefCountedUrlCache(
      (bytes, mimeType) =>
        URL.createObjectURL(
          new Blob([bytes.slice().buffer as ArrayBuffer], { type: mimeType })
        ),
      (url) => URL.revokeObjectURL(url)
    );
  }

  /**
   * Loads every image the theme's button styles, brushes and layout trees
   * paint, plus their variants, and returns a synchronous resolver over them.
   * A preload of a different theme releases the previous theme's URLs first.
   *
   * @example
   * ```xml
   * <ImageBrush id="frame" image="@image/chrome-frame" fit="nineSlice" />
   * ```
   * @example
   * ```ts
   * const images = await assets.preload(ir);
   * images("chrome-frame")?.width; // 96
   * ```
   */
  async preload(ir: ThemeIR): Promise<ThemeImageResolver> {
    const key = `${ir.themeId}\u0000${ir.themeVersion}`;
    if (this.loadedKey !== undefined && this.loadedKey !== key) this.release();
    this.loadedKey = key;

    for (const id of referencedImages(ir)) {
      const image = ir.images[id];
      if (image === undefined) continue;
      const resolved = await this.resolve(ir.themeId, id, image);
      if (resolved === undefined) this.warn(id);
    }

    return (id) => this.resolved.get(id);
  }

  /**
   * Loads one image on demand, for an `<Image>` element that names it. The
   * URL is cached and ref-counted like a preloaded one.
   *
   * @example
   * ```xml
   * <Image source="@image/logo" fit="contain" decorative="true" />
   * ```
   * @example
   * ```ts
   * const logo = await assets.url("classic-blue", ir, "logo");
   * logo?.url; // "blob:http://localhost/1a2b"
   * ```
   */
  async url(
    themeId: string,
    ir: ThemeIR,
    imageId: string
  ): Promise<ResolvedThemeImage | undefined> {
    const existing = this.resolved.get(imageId);
    if (existing !== undefined) return existing;
    const image = ir.images[imageId];
    if (image === undefined) return undefined;
    const resolved = await this.resolve(themeId, imageId, image);
    if (resolved === undefined) this.warn(imageId);
    return resolved;
  }

  /**
   * Revokes every URL the manager holds and forgets the loaded theme.
   *
   * @example
   * ```xml
   * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
   * ```
   * @example
   * ```ts
   * assets.release();
   * ```
   */
  release(): void {
    this.cache.releaseAll();
    this.resolved.clear();
    this.warned.clear();
    this.loadedKey = undefined;
  }

  /** Resolves one image and its variants, caching the result by id. */
  private async resolve(
    themeId: string,
    id: string,
    image: IRImage
  ): Promise<ResolvedThemeImage | undefined> {
    const existing = this.resolved.get(id);
    if (existing !== undefined) return existing;

    const bytes = await this.readFile(themeId, image.src);
    if (bytes === undefined) return undefined;
    const mimeType = mimeTypeOf(image.src);
    const url = await this.acquire(themeId, image.src, bytes, mimeType);
    if (url === undefined) return undefined;

    const size = await decodeSize(bytes, mimeType);
    const variants: string[] = [];
    for (const variant of image.variants) {
      const variantBytes = await this.readFile(themeId, variant.src);
      if (variantBytes === undefined) continue;
      const variantUrl = await this.acquire(
        themeId,
        variant.src,
        variantBytes,
        mimeTypeOf(variant.src)
      );
      if (variantUrl === undefined) continue;
      variants.push(`url("${escapeUrl(variantUrl)}") ${variant.scale}x`);
    }

    const resolved: ResolvedThemeImage = {
      url,
      ...(variants.length === 0
        ? {}
        : {
            set: `image-set(url("${escapeUrl(url)}") 1x, ${variants.join(", ")})`,
          }),
      ...(size === undefined ? {} : { width: size.width, height: size.height }),
      ...(image.slice === undefined ? {} : { slice: image.slice }),
    };
    this.resolved.set(id, resolved);
    return resolved;
  }

  /** Acquires one file's URL from the ref-counted cache. */
  private async acquire(
    themeId: string,
    path: string,
    bytes: Uint8Array,
    mimeType: string
  ): Promise<string | undefined> {
    return this.cache.acquire(`${themeId}\u0000${path}`, async () => ({
      bytes,
      mimeType,
    }));
  }

  /** Logs a missing image once per id. */
  private warn(id: string): void {
    if (this.warned.has(id)) return;
    this.warned.add(id);
    console.warn(`[themes] Could not load the image ${id}.`);
  }
}

/** The image ids the theme's button styles, brushes and layout trees paint, in stable order. */
function referencedImages(ir: ThemeIR): string[] {
  const ids = new Set<string>();
  for (const style of Object.values(ir.buttonStyles)) {
    collectImageRef(style.base.image, ids);
    for (const state of style.states) {
      collectImageRef(state.properties.image, ids);
    }
  }
  for (const brush of Object.values(ir.brushes)) {
    if (brush.type === "image") ids.add(brush.image);
  }
  for (const root of Object.values(ir.layouts)) {
    if (root !== undefined) collectLayoutImages(root, ids);
  }
  return [...ids].sort();
}

/** Adds the image ids every attribute of a layout tree references. */
function collectLayoutImages(node: IRNode, ids: Set<string>): void {
  for (const value of Object.values(node.attributes)) {
    collectImageRef(value, ids);
  }
  for (const child of node.children) collectLayoutImages(child, ids);
}

/** Adds the id of an image reference to a set. */
function collectImageRef(value: IRValue | undefined, ids: Set<string>): void {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return;
  }
  if (!("ref" in value) || value.ref !== "image") return;
  if (typeof value.id === "string") ids.add(value.id);
}

/** The natural size of an image, decoded from its bytes. */
async function decodeSize(
  bytes: Uint8Array,
  mimeType: string
): Promise<{ width: number; height: number } | undefined> {
  const blob = new Blob([bytes.slice().buffer as ArrayBuffer], {
    type: mimeType,
  });
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(blob);
      const size = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
      return size;
    } catch {
      return decodeWithImage(blob);
    }
  }
  return decodeWithImage(blob);
}

/** The natural size of an image, decoded through an `Image` element. */
function decodeWithImage(
  blob: Blob
): Promise<{ width: number; height: number } | undefined> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
      URL.revokeObjectURL(url);
    };
    image.onerror = () => {
      resolve(undefined);
      URL.revokeObjectURL(url);
    };
    image.src = url;
  });
}
