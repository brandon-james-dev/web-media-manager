import type { IMetadataReader } from "@/lib/contracts/IMetadataReader";

/**
 * Port the application core depends on to obtain a metadata reader.
 *
 * The metadata reading core functions (`core.metadata.readTags`,
 * `scanning.scanSongs`, etc.) take an `IMetadataReader`. This port supplies
 * the concrete platform implementation (~browser: TagLibMetadataReader;
 * server: node-taglib, later). Wired in via `setMetadataReaderProvider`
 * during bootstrap, mirroring the store port.
 */
let metadataReaderProvider: (() => IMetadataReader) | null = null;

/** Register the platform's metadata reader implementation. */
export function setMetadataReaderProvider(
  provider: () => IMetadataReader
): void {
  metadataReaderProvider = provider;
}

/** Access the platform's metadata reader through the portable port. */
export function getMetadataReader(): IMetadataReader {
  if (!metadataReaderProvider) {
    throw new Error(
      "[core/ports/metadataReader] No metadata reader provider registered — " +
        "call setMetadataReaderProvider() during bootstrap."
    );
  }
  return metadataReaderProvider();
}
