import type { MetadataProviderRegistry } from "@/core/ports";
import { ItunesMetadataService } from "./itunes/ItunesMetadataService";
import { MusicBrainzMetadataService } from "./musicbrainz/MusicBrainsMetadataService";
import { MetadataProvider } from "./online/MetadataProvider";

/**
 * Registers the metadata providers that ship with the app.
 *
 * Built-ins go through the same registry as installed plugin providers, so the
 * lookup and the provider picker never special-case one of them.
 *
 * @example
 * ```ts
 * const registry = createMetadataProviderRegistry();
 * registerBuiltinMetadataProviders(registry);
 * ```
 */
export function registerBuiltinMetadataProviders(
  registry: MetadataProviderRegistry
): void {
  registry.registerProvider(
    {
      id: MetadataProvider.iTunes,
      name: "iTunes",
      origin: "builtin",
      hasAlbumLookup: true,
    },
    () => new ItunesMetadataService(),
    () => new ItunesMetadataService()
  );

  registry.registerProvider(
    {
      id: MetadataProvider.MusicBrainz,
      name: "MusicBrainz",
      origin: "builtin",
      hasAlbumLookup: true,
    },
    () => new MusicBrainzMetadataService(),
    () => new MusicBrainzMetadataService()
  );
}
