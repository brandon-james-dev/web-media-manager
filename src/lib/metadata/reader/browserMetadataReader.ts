import { setMetadataReaderProvider } from "@/core/ports";
import { TagLibMetadataReader } from "./TagLibMetadataReader";

/**
 * Browser metadata reader binding.
 *
 * Binds the core's metadata-reader port to the browser implementation
 * (taglib-wasm via TagLibMetadataReader). Wired in during bootstrap so
 * core metadata-reading functions obtain the browser reader without
 * constructing it from `@/lib` at each call site.
 */
export function registerBrowserMetadataReader(): void {
  setMetadataReaderProvider(() => new TagLibMetadataReader());
}
