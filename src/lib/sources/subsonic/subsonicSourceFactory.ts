import type { SubsonicMusicSource } from "@/models";
import { SubsonicClient } from "@/lib/sources/subsonic/SubsonicClient";
import {
  setSubsonicSecret,
  getSubsonicSecret,
} from "@/lib/sources/subsonic/subsonicSecrets";
import { getSourcesStore } from "@/core/ports";
import { uuidv7 } from "uuidv7";
import type { MusicSourceCapabilities } from "@/core/contracts/sources";

/**
 * Default capabilities for a Subsonic source. Streamable, browsable and
 * searchable through the Open Subsonic API; metadata write-back and
 * library scanning are not supported via the API surface yet.
 */
const SUBSONIC_CAPABILITIES: MusicSourceCapabilities = {
  streaming: true,
  browsing: true,
  searching: true,
  metadataWrite: false,
  libraryScanning: false,
  playlistWrite: false,
};

export interface AddSubsonicSourceInput {
  baseUrl: string;
  username: string;
  password: string;
  musicFolderId?: string;
  name?: string;
}

/**
 * Authorize against an Open Subsonic server (ping) then create + persist
 * the SubsonicMusicSource.
 *
 * The entity stored in the sources table carries NO password — the auth
 * material is written to the secret store (keyed by source id), keeping the
 * JSON-safe entity contract clean.
 *
 * @returns the created source
 * @throws with the server's error when ping fails (bad URL, bad creds).
 */
export async function addSubsonicSource(
  input: AddSubsonicSourceInput
): Promise<SubsonicMusicSource> {
  const client = new SubsonicClient({
    baseUrl: input.baseUrl,
    musicFolderId: input.musicFolderId,
  });

  // Authorization gate: verify the connection + credentials before saving.
  await client.ping({
    username: input.username,
    password: input.password,
  });

  const id = uuidv7();
  const uriDomain = new URL(input.baseUrl).hostname;

  // Dedupe on baseUrl: re-adding an existing server (e.g. re-connect, edit,
  // or a second add) must NOT create a new source id — otherwise every song
  // id changes (wmm://<domain>/<sourceId>/<itemId>) and re-imports produce
  // duplicates. Reuse the existing source's id, updating config instead.
  const existing = (await getSourcesStore().getSources()).find(
    (s) =>
      s.kind === "subsonic" &&
      "config" in s &&
      (s.config as { baseUrl?: string }).baseUrl ===
        input.baseUrl.replace(/\/+$/, "")
  );

  const finalId = existing?.id ?? id;

  const source: SubsonicMusicSource = {
    id: finalId,
    uriDomain,
    name: input.name ?? existing?.name ?? `Subsonic: ${uriDomain}`,
    enabled: true,
    createdAt: existing?.createdAt ?? new Date(),
    priority: 50,
    capabilities: SUBSONIC_CAPABILITIES,
    kind: "subsonic",
    config: {
      baseUrl: input.baseUrl.replace(/\/+$/, ""),
      username: input.username,
      ...(input.musicFolderId ? { musicFolderId: input.musicFolderId } : {}),
    },
  };

  if (existing) {
    await getSourcesStore().saveSource(source);
  } else {
    await getSourcesStore().addSource(source);
  }

  // Auth material lives apart from the entity (never persisted on it).
  await setSubsonicSecret(finalId, input.password);

  return source;
}

/** Retrieve the stored password for a Subsonic source (or null). */
export async function getSubsonicSourceSecret(
  sourceId: string
): Promise<string | null> {
  return await getSubsonicSecret(sourceId);
}
