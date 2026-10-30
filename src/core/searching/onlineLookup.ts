import { lookupMetadataOnline } from "@/lib/metadata-providers/lookupMetadataOnline";
import type { MetadataProvider } from "@/lib/metadata-providers/online/MetadataProvider";
import type { IOnlineMetadata } from "@/lib/metadata-providers/online/IOnlineMetadata";
import type { OnlineLookupParams } from "./types";

/**
 * Domain: Searching (online metadata providers).
 * Open Subsonic equivalent: n/a — a WMM extension for MusicBrainz/iTunes
 * lookups from within the editor.
 */
export async function lookupOnlineMetadata(
  provider: MetadataProvider,
  params: OnlineLookupParams
): Promise<IOnlineMetadata[] | null> {
  return lookupMetadataOnline(
    provider,
    params.query,
    params.isCancelled,
    params.reportProgress
  );
}
