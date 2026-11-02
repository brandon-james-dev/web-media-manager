import { Server } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { addSubsonicSource } from "@/lib/sources/subsonic/subsonicSourceFactory";
import { fetchSubsonicSongBytes } from "@/lib/sources/subsonic/subsonicImport";
import { deleteSubsonicSecret } from "@/lib/sources/subsonic/subsonicSecrets";
import { subsonicMusicSourceCollector } from "@/lib/sources/collectors";
import { getMusicSourceImportConfig } from "@/lib/sources/config";
import { getJobService } from "@/core/jobs";
import { getSourcesStore } from "@/core/ports";
import { toast } from "@/components/ui/toast";
import { uuidv7 } from "uuidv7";
import type { Song } from "@/models/Song";
import type { MusicSource } from "@/models";
import type { WorkerProgress } from "@/core/jobs";
import type {
  IMusicSourceStrategy,
  IJobHandle,
  MusicSourceConfigField,
} from "../IMusicSourceStrategy";

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
    const url = new URL(s.trim());
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

export class SubsonicMusicSourceStrategy implements IMusicSourceStrategy {
  readonly kind = "subsonic" as const;
  readonly name = "Subsonic server";
  readonly description = "Connect to an Open Subsonic API server";
  readonly icon = <Server className="h-8 w-8" />;
  readonly sourceKindBadge = (
    <Badge variant="secondary">
      <Server />
      Subsonic
    </Badge>
  );
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
        musicSourceConfig: getMusicSourceImportConfig(source),
      },
    });

    toast.add({
      type: "success",
      title: "Importing library from Subsonic server",
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
   * Resolve picture bytes for a subsonic song: embedded `data` is used
   * directly; a `subsonic://coverart/<id>` URL is resolved to the server's
   * cover art at the largest available size through the subsonic client.
   */
  async resolvePictureBytes(pic: {
    data?: Uint8Array;
    url?: string;
  }, song: Song): Promise<Uint8Array | null> {
    return subsonicMusicSourceCollector.resolvePictureBytes(pic, song);
  }

  /**
   * Collect a subsonic source's songs — delegates to the pure
   * `subsonicMusicSourceCollector` (shared with the worker's bulk import).
   */
  async collectSongs(options: {
    source: MusicSource;
    isCancelled?: () => boolean;
    reportProgress?: (progress: WorkerProgress) => void;
  }): Promise<Song[]> {
    return subsonicMusicSourceCollector.collectSongs(options);
  }

  /**
   * Re-query the server's library and upsert its songs. Enqueues a
   * bulk-import job so progress + completion appear in the notification
   * center, consistent with a local folder re-scan. The returned handle
   * can cancel the job (passes a stable job id into the enqueue).
   */
  sync(options: { source: MusicSource; silent?: boolean }): IJobHandle | null {
    const { source, silent } = options;
    if (source.kind !== "subsonic") return null;

    const jobId = uuidv7();
    getJobService().enqueue({
      type: "Bulk Import",
      silent,
      payload: {
        musicSource: source,
        musicSourceConfig: getMusicSourceImportConfig(source),
      },
    }, jobId);

    return {
      jobId,
      cancel: () => getJobService().cancelJob(jobId),
    };
  }

  /** Cancel an in-flight add/sync job for this source kind. */
  cancelSync(jobId?: string): void {
    if (jobId) getJobService().cancelJob(jobId);
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
    deleteSubsonicSecret(source.id);
    await options.onSourceRemoved?.();
  }
}
