import { addSubsonicSource } from "@/lib/sources/subsonic/subsonicSourceFactory";
import { fetchSubsonicSongBytes } from "@/lib/sources/subsonic/subsonicImport";
import {
  collectSubsonicFavoriteIds,
  collectSubsonicPlaylists,
  collectSubsonicSongChanges,
  collectSubsonicSongs,
  removeSubsonicPlaylists,
} from "@/lib/sources/subsonic/subsonicImport";
import {
  deleteSubsonicSecret,
  getSubsonicSecret,
} from "@/lib/sources/subsonic/subsonicSecrets";
import {
  SubsonicClient,
  type SubsonicCredentials,
} from "@/lib/sources/subsonic/SubsonicClient";
import { getMusicSourceImportConfig } from "@/lib/sources/config";
import type { MusicSourceImportConfig } from "@/lib/sources/config";
import { getJobService } from "@/core/jobs";
import type { WorkerProgress } from "@/core/jobs";
import { getSourcesStore } from "@/core/ports";
import { uuidv7 } from "uuidv7";
import type { Song } from "@/models/Song";
import type { MusicSource, Playlist, SubsonicMusicSource } from "@/models";
import type {
  IMusicSourceStrategy,
  IJobHandle,
  SongChanges,
} from "../IMusicSourceStrategy";
import type { MusicSourceConfigField } from "../MusicSourceConfigField";

/** Config the Subsonic strategy's standardized form collects before add(). */
export interface SubsonicSourceConfig {
  baseUrl: string;
  username: string;
  password: string;
  musicFolderId?: string;
}

/** Validate the server URL field. */
function isValidHttpUrl(s: string): boolean {
  try {
    const url = new URL(s);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Build subsonic credentials from the source + generic import config
 *  (main-thread-resolved secret preferred; stored secret as fallback). */
async function sourceConfigToCredentials(
  source: { id: string; config: { username?: string } },
  config?: MusicSourceImportConfig
): Promise<SubsonicCredentials | undefined> {
  const password = config?.secret ?? (await getSubsonicSecret(source.id));
  if (!password) return undefined;
  return {
    username:
      config?.config && "username" in config.config
        ? (config.config.username as string)
        : (source.config.username ?? ""),
    password,
  };
}

export class SubsonicMusicSourceStrategy implements IMusicSourceStrategy {
  readonly kind = "subsonic" as const;
  readonly name = "Subsonic server";
  readonly description = "Connect to an Open Subsonic API server";
  readonly requiresConfig = true;

  /** Declarative fields — the caller's standard config form renders these. */
  readonly configFields: MusicSourceConfigField[] = [
    {
      name: "baseUrl",
      label: "Server URL",
      placeholder: "https://music.example.com",
      required: true,
      validate: (v) =>
        !v.trim()
          ? "Enter a server URL"
          : !isValidHttpUrl(v)
            ? "URL must start with http:// or https://"
            : undefined,
    },
    {
      name: "username",
      label: "Username",
      placeholder: "username",
      required: true,
      validate: (v) => (!v.trim() ? "Username is required" : undefined),
    },
    {
      name: "password",
      label: "Password",
      type: "password",
      placeholder: "••••••••",
      required: true,
      validate: (v) => (!v ? "Password is required" : undefined),
    },
    {
      name: "musicFolderId",
      label: "Music folder id (optional)",
      type: "text",
      placeholder: "1",
      required: false,
    },
  ];

  /** Source persisted by `connect()`, consumed by `add()` for the import. */
  private connectedSource: MusicSource | null = null;

  async connect(options: {
    onSourceAdded?: () => void | Promise<void>;
    config?: unknown;
  }): Promise<void> {
    const input = options.config as SubsonicSourceConfig | undefined;
    if (!input?.baseUrl || !input.username || !input.password) {
      throw new Error("Server URL, username and password are required");
    }

    const source = await addSubsonicSource({
      baseUrl: input.baseUrl,
      username: input.username,
      password: input.password,
      musicFolderId: input.musicFolderId || undefined,
    });
    this.connectedSource = source;
    await options.onSourceAdded?.();
  }

  async updateSource(options: {
    source: MusicSource;
    config?: unknown;
  }): Promise<void> {
    const input = options.config as SubsonicSourceConfig | undefined;
    if (!input?.baseUrl || !input.username) {
      throw new Error("Server URL and username are required");
    }

    // Persist the edited connection settings on the existing source record.
    // The password is intentionally left unchanged: it stays in the secret
    // store unless replaced via the auth flow — editing the config never
    // wipes stored credentials.
    const updated: SubsonicMusicSource = {
      ...(options.source as SubsonicMusicSource),
      config: {
        baseUrl: input.baseUrl,
        username: input.username,
        musicFolderId: input.musicFolderId || undefined,
      },
    };
    const store = getSourcesStore();
    await store.saveSource(updated);
  }

  async add(options: {
    onSourceAdded?: () => void | Promise<void>;
    config?: unknown;
  }): Promise<void> {
    // If `connect()` ran first, import the connected source.
    const source: MusicSource | undefined =
      this.connectedSource ??
      (options.config as { source?: MusicSource })?.source;
    if (!source) return;

    // Enqueue BEFORE the onSourceAdded callback so a slow/rejecting
    // refresh can never cancel the import.
    getJobService().enqueue({
      type: "Bulk Import",
      payload: {
        musicSource: source,
        // Resolve the source config (incl. secret) on the main thread —
        // web workers can't read localStorage, so it's passed to the job.
        musicSourceConfig: await getMusicSourceImportConfig(source),
      },
    });

    await options.onSourceAdded?.();
    this.connectedSource = null;
  }

  /**
   * Resolve the playable bytes of a subsonic song via the Open Subsonic
   * `stream` endpoint. The song's source is looked up by `song.sourceId`.
   * Returns null when the source is missing its stored credentials or the
   * stream cannot be fetched.
   */
  async resolveSongBytes(song: Song): Promise<ArrayBuffer | null> {
    const sources = await getSourcesStore().getSources();
    const source = sources.find((s) => s.id === song.sourceId);
    if (!source || source.kind !== "subsonic") return null;

    try {
      return await fetchSubsonicSongBytes(source, song);
    } catch (error) {
      console.error("Failed to stream subsonic song:", error);
      return null;
    }
  }

  /**
   * Collect a subsonic source's songs: query the Open Subsonic library,
   * walking albums (progress reports per resolved album). Runs inside
   * the web worker (UI-free).
   */
  async collectSongs(options: {
    source: MusicSource;
    isCancelled?: () => boolean;
    reportProgress?: (progress: WorkerProgress) => void;
    musicSourceConfig?: MusicSourceImportConfig;
  }): Promise<Song[]> {
    if (options.source.kind !== "subsonic") return [];
    const credentials = await sourceConfigToCredentials(
      options.source,
      options.musicSourceConfig
    );
    const songs = await collectSubsonicSongs(
      options.source,
      credentials,
      (resolved, total) => {
        if (total) {
          options.reportProgress?.({
            index: resolved,
            total,
            percent: resolved / total,
            label: `Fetched ${resolved}/${total} albums`,
          });
        } else {
          options.reportProgress?.({
            index: 0,
            total: 1,
            percent: 0,
            label: `Fetched ${resolved} albums`,
          });
        }
      }
    );
    const result: Song[] = [];
    for (let index = 0; index < songs.length; index++) {
      if (options.isCancelled?.()) return result;
      result.push(songs[index]);
    }
    return result;
  }

  /**
   * Collect a subsonic source's changes since the last import. The server
   * answers an unchanged library without listing it; a changed one is read in
   * full.
   */
  async collectSongChanges(options: {
    source: MusicSource;
    since: number;
    reportProgress?: (progress: WorkerProgress) => void;
    musicSourceConfig?: MusicSourceImportConfig;
  }): Promise<SongChanges | null> {
    if (options.source.kind !== "subsonic") return null;
    const credentials = await sourceConfigToCredentials(
      options.source,
      options.musicSourceConfig
    );
    return collectSubsonicSongChanges(
      options.source,
      options.since,
      credentials,
      (resolved, total) =>
        options.reportProgress?.({
          index: resolved,
          total,
          percent: total ? resolved / total : 0,
          label: `Fetched ${resolved}/${total} albums`,
        })
    );
  }

  /**
   * Collect a subsonic source's playlists (worker-safe). The bulk import
   * stores them and prunes any the server no longer has. A server without
   * playlist support yields none rather than failing the song import.
   */
  async collectPlaylists(options: {
    source: MusicSource;
    reportProgress?: (progress: WorkerProgress) => void;
    musicSourceConfig?: MusicSourceImportConfig;
  }): Promise<Playlist[] | null> {
    if (options.source.kind !== "subsonic") return null;
    const credentials = await sourceConfigToCredentials(
      options.source,
      options.musicSourceConfig
    );
    try {
      return await collectSubsonicPlaylists(
        options.source,
        credentials,
        (resolved, total) =>
          options.reportProgress?.({
            index: resolved,
            total,
            percent: total ? resolved / total : 1,
            label: `Fetched ${resolved}/${total} playlists`,
          })
      );
    } catch (error) {
      console.warn("Subsonic playlist fetch failed:", error);
      return null;
    }
  }

  /** Songs starred on the server, as app song ids. */
  async collectFavorites(options: {
    source: MusicSource;
    songs: Song[];
    musicSourceConfig?: MusicSourceImportConfig;
  }): Promise<string[] | null> {
    if (options.source.kind !== "subsonic") return null;
    const credentials = await sourceConfigToCredentials(
      options.source,
      options.musicSourceConfig
    );
    try {
      return await collectSubsonicFavoriteIds(options.source, credentials);
    } catch (error) {
      console.warn("Subsonic favorites fetch failed:", error);
      return null;
    }
  }

  /**
   * Resolve picture bytes for a subsonic song: embedded `data` is used
   * directly; a `subsonic://coverart/<id>` URL is resolved to the server's
   * cover art at the largest available size via the subsonic client.
   */
  async resolvePictureBytes(
    pic: {
      data?: Uint8Array;
      url?: string;
    },
    song: Song,
    musicSourceConfig?: MusicSourceImportConfig
  ): Promise<Uint8Array | null> {
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
      const password =
        musicSourceConfig?.secret ?? (await getSubsonicSecret(source.id));
      if (!password) return null;
      const creds: SubsonicCredentials = {
        username:
          musicSourceConfig?.config && "username" in musicSourceConfig.config
            ? (musicSourceConfig.config.username as string)
            : (source.config.username ?? ""),
        password,
      };
      const buf = await client.getCoverArtBytes(creds, match[1]);
      return new Uint8Array(buf);
    } catch (error) {
      console.error("Failed to resolve subsonic cover art:", error);
      return null;
    }
  }

  /**
   * Re-query the server's library and upsert its songs. Enqueues a
   * bulk-import job so progress + completion appear in the notification
   * center, consistent with a local folder re-scan. The returned handle
   * can cancel the job (passes a stable job id into the enqueue).
   */
  async sync(options: {
    source: MusicSource;
    silent?: boolean;
  }): Promise<IJobHandle | null> {
    const { source, silent } = options;
    if (source.kind !== "subsonic") return null;

    const jobId = uuidv7();
    getJobService().enqueue(
      {
        type: "Bulk Import",
        silent,
        payload: {
          musicSource: source,
          musicSourceConfig: await getMusicSourceImportConfig(source),
        },
      },
      jobId
    );

    return {
      jobId,
      cancel: () => getJobService().cancelJob(jobId),
    };
  }

  /** Cancel an in-flight add/sync job for this source kind. */
  cancelSync(jobId?: string): void {
    if (jobId) getJobService().cancelJob(jobId);
  }

  /** Resolve the subsonic auth password (main-thread secret store). */
  async getSecret(source: MusicSource): Promise<string | undefined> {
    return (await getSubsonicSecret(source.id)) ?? undefined;
  }

  /**
   * Remove the subsonic source: the store's `deleteSource` drops the source
   * record + its songs, and the stored auth secret is wiped so removing the
   * source revokes access to the server.
   */
  async removeSource(options: {
    source: MusicSource;
    onSourceRemoved?: () => void | Promise<void>;
  }): Promise<void> {
    const store = getSourcesStore();
    const source = options.source;
    await store.deleteSource(source.id);
    await removeSubsonicPlaylists(source);
    await deleteSubsonicSecret(source.id);
    await options.onSourceRemoved?.();
  }
}
