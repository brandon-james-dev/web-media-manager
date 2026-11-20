import type { WmmResourceKey } from "@/i18n";
import type {
  MusicSourceProbe,
  MusicSourceProbeExtension,
} from "../IMusicSourceStrategy";
import type { SubsonicClient, SubsonicCredentials } from "./SubsonicClient";

/**
 * Open Subsonic extensions this app can consume, keyed by the name the server
 * advertises. Anything absent from this map is still listed in the add form,
 * but marked as unsupported.
 */
export const SUPPORTED_EXTENSIONS: Record<string, WmmResourceKey> = {
  songLyrics: "source.extensionSongLyrics",
};

/**
 * Ask the server what it is and what it supports.
 *
 * Detection needs no credentials: `type`, `serverVersion` and `openSubsonic`
 * ride on the response wrapper, so they arrive even when the request fails
 * authentication. The extension list is different — it is the result of an
 * endpoint, so it only comes back on an authenticated call. An empty list
 * therefore means "not reported yet", not "supports nothing".
 */
export async function probeSubsonicServer(
  client: SubsonicClient,
  creds: SubsonicCredentials
): Promise<MusicSourceProbe | null> {
  const identity = await client.identify(creds);

  // Not a Subsonic server at all: nothing to report.
  if (!identity) return null;

  if (!identity.openSubsonic) {
    return { openSubsonic: false, extensions: [] };
  }

  const base: MusicSourceProbe = {
    openSubsonic: true,
    ...(identity.type ? { serverType: identity.type } : {}),
    ...(identity.serverVersion
      ? { serverVersion: identity.serverVersion }
      : {}),
    extensions: [],
  };

  // Without valid credentials the server will not list its extensions.
  if (!identity.authOk) return base;

  const advertised = await client.getOpenSubsonicExtensions(creds);

  return {
    ...base,
    extensions: (advertised ?? []).map(toProbeExtension),
  };
}

function toProbeExtension(extension: {
  name: string;
  versions: number[];
}): MusicSourceProbeExtension {
  const descriptionKey = SUPPORTED_EXTENSIONS[extension.name];

  return {
    name: extension.name,
    versions: extension.versions,
    supported: descriptionKey !== undefined,
    ...(descriptionKey ? { descriptionKey } : {}),
  };
}
