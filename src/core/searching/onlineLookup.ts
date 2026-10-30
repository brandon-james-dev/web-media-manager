import { lookupMetadataOnline } from "@/lib/metadata/lookupMetadataOnline";
import type { MetadataProvider } from "@/lib/online-metadata-utils/MetadataProvider";
import type { IOnlineMetadata } from "@/lib/online-metadata-utils/IOnlineMetadata";
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
