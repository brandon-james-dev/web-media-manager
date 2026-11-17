/**
 * One stored file of an installed package (a theme or a visualizer plugin),
 * keyed by the package id and its archive-relative path.
 *
 * @example
 * ```xml
 * <Image id="logo" src="assets/images/logo.png" />
 * ```
 * @example
 * ```ts
 * const record: PackageFileRecord = {
 *   ownerId: "classic-blue",
 *   path: "assets/images/logo.png",
 *   bytes,
 *   size: bytes.byteLength,
 *   mimeType: "image/png",
 * };
 * ```
 */
export interface PackageFileRecord {
  id?: number;
  ownerId: string;
  path: string;
  bytes: Uint8Array;
  size: number;
  mimeType: string;
}

/**
 * Shared port for the bytes of installed packages. Each package kind gets
 * its own instance over its own table, so theme and plugin files never mix.
 *
 * @example
 * ```xml
 * <Face src="assets/fonts/body.woff2" weight="400" />
 * ```
 * @example
 * ```ts
 * await files.putFiles(records);
 * const font = await files.getFile("classic-blue", "assets/fonts/body.woff2");
 * ```
 */
export interface PackageFileStore {
  listFiles(ownerId: string): Promise<PackageFileRecord[]>;
  getFile(
    ownerId: string,
    path: string
  ): Promise<PackageFileRecord | undefined>;
  putFiles(files: PackageFileRecord[]): Promise<void>;
  deleteFiles(ownerId: string): Promise<void>;
}
