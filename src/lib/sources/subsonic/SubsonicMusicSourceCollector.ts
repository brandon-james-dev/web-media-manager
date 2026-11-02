/**
 * Subsonic music source collector (worker-safe).
 *
 * Collects a Subsonic server's library via the Open Subsonic walk, with NO
 * UI imports — safe to evaluate inside the web worker bundle.
 */
import type { Song } from "@/models/Song";
import { getSourcesStore } from "@/core/ports";
import { getSubsonicSecret } from "./subsonicSecrets";
import {
  SubsonicClient,
  type SubsonicCredentials,
} from "./SubsonicClient";
import { collectSubsonicSongs } from "./subsonicImport";
import type { IMusicSourceCollector } from "../IMusicSourceCollector";
import type { MusicSourceImportConfig } from "../config";

/** Build subsonic credentials from the source + generic import config
 *  (main-thread-resolved secret preferred; stored secret as fallback). */
function sourceConfigToCredentials(
  source: { id: string; config: { username?: string } },
  config?: MusicSourceImportConfig
): SubsonicCredentials | undefined {
  const password = config?.secret ?? getSubsonicSecret(source.id);
  if (!password) return undefined;
  return {
    username:
      config?.config && "username" in config.config
        ? (config.config.username as string)
        : source.config.username ?? "",
    password,
  };
}

/**
 * Collect a Subsonic server's songs via the Open Subsonic library walk.
 */
export const subsonicMusicSourceCollector: IMusicSourceCollector = {
  kind: "subsonic",
  async collectSongs({ source, isCancelled, musicSourceConfig, reportProgress }) {
    if (source.kind !== "subsonic") return [];
    const credentials = sourceConfigToCredentials(source, musicSourceConfig);
    const songs = await collectSubsonicSongs(source, credentials, (resolved, total) => {
      if (total) {
        reportProgress?.({
          index: resolved,
          total,
          percent: resolved / total,
          label: `Fetched ${resolved}/${total} albums`,
        });
      }
    });
    const result: Song[] = [];
    for (let index = 0; index < songs.length; index++) {
      if (isCancelled?.()) return result;
      result.push(songs[index]);
    }
    return result;
  },

  /**
   * Resolve picture bytes for a subsonic song: embedded `data` is used
   * directly; a `subsonic://coverart/<id>` URL is resolved to the server's
   * cover art at the largest available size via the subsonic client.
   */
  async resolvePictureBytes(pic: {
    data?: Uint8Array;
    url?: string;
  }, song: Song, musicSourceConfig?: MusicSourceImportConfig): Promise<Uint8Array | null> {
    if (pic.data && pic.data.length > 0) return pic.data;

    const match = /^subsonic:\/\/coverart\/(.+)$/.exec(pic.url ?? "");
    if (!match) return null;

    const sources = await getSourcesStore().getSources();
    const source = sources.find((s) => s.id === song.sourceId);
    if (!source || source.kind !== "subsonic") return null;

    try {
      const client = new SubsonicClient(source.config);
      // Prefer the transient, main-thread-resolved secret (workers can't
      // read localStorage); fall back to the stored secret when the
      // config wasn't threaded (e.g. called on the main thread).
      const password = musicSourceConfig?.secret ?? getSubsonicSecret(source.id);
      if (!password) return null;
      const creds: SubsonicCredentials = {
        username: musicSourceConfig?.config && "username" in musicSourceConfig.config
          ? (musicSourceConfig.config.username as string)
          : source.config.username ?? "",
        password,
      };
      const buf = await client.getCoverArtBytes(creds, match[1]);
      return new Uint8Array(buf);
    } catch (error) {
      console.error("Failed to resolve subsonic cover art:", error);
      return null;
    }
  },
};
