import type { MusicSourceKind } from "@/core/contracts";
import type { MusicSource, Playlist } from "@/models";
import type { Song } from "@/models/Song";
import type { WorkerProgress } from "@/core/jobs";
import type { MusicSourceImportConfig } from "./config";
import type { MusicSourceConfigField } from "./MusicSourceConfigField";

/**
 * Strategy for a music source kind: how to add it (configure + persist) and
 * how to resolve the playable audio bytes of one of its songs.
 *
 * Mirrors the `ISyncStrategy` pattern: each kind of source the app can
 * attach to (local folder, Subsonic server, ...) is a strategy that
 * describes itself (for UI), runs its own add orchestration, and resolves
 * song bytes for playback.
 *
 * The selection UI renders the strategy's card (icon, name, description);
 * choosing one calls `add()`. Strategies that need settings first expose
 * `requiresConfig` (and `configFields`) so the caller's standard config
 * form collects them before `add()` runs. Playback resolves bytes through
 * `resolveSongBytes()`, so the provider dispatches by source kind instead
 * of branching on it.
 */
export interface IMusicSourceStrategy {
  /** The MusicSource kind this strategy adds (discriminator). */
  readonly kind: MusicSourceKind;
  /** Display name ("On device", "Subsonic server"...). */
  readonly name: string;
  /** One-line description shown on the card. */
  readonly description: string;
  /** Whether this source kind can run on the current platform. E.g. the
   *  on-device source needs the File System Access API (showDirectoryPicker),
   *  which Safari lacks — the chooser disables it there. Default true. */
  readonly isAvailable?: boolean;
  /** Whether `add()` needs a config form to be filled in first. */
  readonly requiresConfig: boolean;
  /**
   * Declarative fields the caller's standard config form renders when
   * `requiresConfig` is true. The caller owns the form + validation and
   * submits the collected config object to `onSubmit`. Optional — a
   * strategy without config fields just runs `add()` directly.
   */
  configFields?: MusicSourceConfigField[];

  /**
   * Authorize + persist the source WITHOUT starting the import. A strategy
   * with config fields calls this from its "connect" action so the user can
   * establish the connection first; the import runs separately via `add()`
   * (typically on form submission / Enter).
   */
  connect?(options: {
    onSourceAdded?: () => void | Promise<void>;
    config?: unknown;
  }): Promise<void>;

  /**
   * Persist edits to an existing configured source (e.g. a new baseUrl,
   * username, or folder for a subsonic instance). The caller pre-fills the
   * standard config form with the stored source's config and submits here.
   * Optional — a source kind without editable settings omits it (its edit
   * button won't appear).
   */
  updateSource?(options: {
    source: MusicSource;
    config?: unknown;
  }): Promise<void>;

  /**
   * Run the full add orchestration for this source kind.
   * @param options.onSourceAdded call after the source is persisted so the
   *   caller can refresh its list.
   * @param options.config type-specific config (e.g. { baseUrl, username,
   *   password, musicFolderId }) when `requiresConfig` is true.
   */
  add(options: {
    onSourceAdded?: () => void | Promise<void>;
    config?: unknown;
  }): Promise<void>;

  /**
   * Resolve the playable audio bytes of a song from this source kind.
   * Returns null when the song's bytes can't be obtained (missing file,
   * failed stream, removed source).
   */
  resolveSongBytes(song: Song): Promise<ArrayBuffer | null>;

  /**
   * Resolve this source kind's transient auth secret (e.g. a Subsonic
   * password stored encrypted in the browser secret store), if it has one.
   * Returns undefined for kinds without auth material. Called on the main
   * thread (web workers can't read localStorage/IDB secrets); the result is
   * threaded into worker jobs via MusicSourceImportConfig.
   */
  getSecret?(source: MusicSource): Promise<string | undefined>;

  /**
   * Run a re-sync of an existing source of this kind (e.g. re-scan a local
   * folder, re-query a Subsonic server library). Returns a handle so the
   * caller can cancel the sync job (progress/completion still come through
   * the job system).
   * @returns null when this source kind cannot be re-synced standalone.
   */
  sync(options: {
    source: MusicSource;
    /** Suppress UI notifications for this sync (e.g. startup resyncs). */
    silent?: boolean;
  }): IJobHandle | null | Promise<IJobHandle | null>;

  /**
   * Cancel an in-flight sync (or add) job. No-op when the job already
   * completed or was cancelled.
   */
  cancelSync(jobId?: string): void;

  /**
   * Remove this source kind's persisted record + auth material + library
   * (the store drops the source + its songs; the strategy drops any
   * additional credentials/artifacts it owns).
   */
  removeSource(options: {
    source: MusicSource;
    onSourceRemoved?: () => void | Promise<void>;
  }): Promise<void>;

  /**
   * Collect this source kind's library entries as app songs (bulk import).
   * Reports progress via the optional callback; returns the imported songs.
   * Runs inside the web worker (UI-free), so implementations must not
   * import UI modules.
   */
  collectSongs(options: {
    source: MusicSource;
    isCancelled?: () => boolean;
    reportProgress?: (progress: WorkerProgress) => void;
    /** Generic source config (incl. any main-thread-resolved secret). */
    musicSourceConfig?: MusicSourceImportConfig;
  }): Promise<Song[]>;

  /**
   * Collect this source kind's playlists as app playlists (stamped with the
   * source's `sourceId`). Optional: kinds without source-held playlists omit
   * it. Return null when playlists could not be read, so the import leaves
   * the source's existing playlists untouched instead of pruning them.
   * Runs inside the web worker (UI-free).
   */
  collectPlaylists?(options: {
    source: MusicSource;
    isCancelled?: () => boolean;
    reportProgress?: (progress: WorkerProgress) => void;
    musicSourceConfig?: MusicSourceImportConfig;
  }): Promise<Playlist[] | null>;

  /**
   * Resolve the raw image bytes of a song picture for artwork processing.
   * `data` is used directly when present (embedded tag art); otherwise the
   * source's cover art is resolved at the largest available size (e.g. a
   * Subsonic cover-art id through the server). Returns null when no bytes
   * are obtainable. Runs inside the web worker (UI-free).
   */
  resolvePictureBytes(
    pic: {
      data?: Uint8Array;
      url?: string;
    },
    song: Song,
    musicSourceConfig?: MusicSourceImportConfig
  ): Promise<Uint8Array | null>;
}

/** Handle to a cancellable background job (sync, add import). */
export interface IJobHandle {
  /** The background-job id, usable with `getJobService().cancelJob`. */
  jobId: string;
  /** Cancel the job (no-op if already done). */
  cancel(): void;
}
