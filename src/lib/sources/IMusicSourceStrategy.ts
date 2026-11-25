import type { MusicSourceKind } from "@/core/contracts";
import type { WmmResourceKey } from "@/i18n";
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
/** One extension a probed server advertises, as the form displays it. */
export interface MusicSourceProbeExtension {
  name: string;
  versions: number[];
  /** True when this app can consume the extension. */
  supported: boolean;
  /** What the app does with it — shown next to a supported extension. */
  descriptionKey?: WmmResourceKey;
}

/**
 * What a strategy learned about a server from its config, before the source
 * is added. The standard config form renders this under the fields so the
 * user can see what the server supports.
 */
export interface MusicSourceProbe {
  /** True when the server implements the Open Subsonic extensions. */
  openSubsonic: boolean;
  /** Server software name, e.g. "Navidrome". */
  serverType?: string;
  /** Server software version. */
  serverVersion?: string;
  extensions: MusicSourceProbeExtension[];
}

export interface IMusicSourceStrategy {
  /** The MusicSource kind this strategy adds (discriminator). */
  readonly kind: MusicSourceKind;
  /** Display name ("On device", "Subsonic server"...). */
  readonly name: string;
  /** Resource key of the display name, so the picker renders it translated.
   *  Absent for a plugin source, whose name comes from its manifest. */
  readonly labelKey?: WmmResourceKey;
  /** One-line description shown on the card. */
  readonly description: string;
  /** Resource key of the description shown on the card. Absent for a plugin
   *  source, whose description comes from its manifest. */
  readonly descriptionKey?: WmmResourceKey;
  /** Provider id, for a plugin-contributed source kind. */
  readonly providerId?: string;
  /** Installed plugin that contributed this provider, when it is a plugin. */
  readonly pluginId?: string;
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
   * Inspect the server described by the config form's current values, so the
   * form can show what it supports before the source is added. Called as the
   * user types (debounced); return null when there is nothing to report yet
   * (incomplete or invalid config, unreachable server).
   */
  probe?(options: {
    config?: unknown;
    /**
     * Id of the source being edited, when the form is in edit mode. Lets a
     * strategy reuse stored credentials (which are never held in form state)
     * so the probe can report the same detail as when adding.
     */
    sourceId?: string;
  }): Promise<MusicSourceProbe | null>;

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
   * Drop the artifacts this source kind owns beyond the source record and its
   * songs — stored credentials, mirrored playlists.
   *
   * Called after the removal job has already deleted the songs and the source
   * record, so implementations must not touch either. Optional: a kind with
   * nothing extra to clean up leaves it unimplemented.
   */
  cleanupRemovedSource?(source: MusicSource): Promise<void>;

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
   * Collect only what changed since the last successful import. Optional:
   * kinds that cannot tell omit it, or return null, and the import reads the
   * full library. Runs inside the web worker (UI-free).
   */
  collectSongChanges?(options: {
    source: MusicSource;
    /** Epoch ms of the last successful import of this source. */
    since: number;
    /** Relative paths of this source's songs already in the catalog. */
    knownPaths: Set<string>;
    isCancelled?: () => boolean;
    reportProgress?: (progress: WorkerProgress) => void;
    musicSourceConfig?: MusicSourceImportConfig;
  }): Promise<SongChanges | null>;

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
   * Collect the ids of songs the source marks as favorites (e.g. starred on a
   * Subsonic server). Optional. Return null when they could not be read; the
   * import then leaves the app's favorites untouched. Runs inside the web
   * worker (UI-free).
   */
  collectFavorites?(options: {
    source: MusicSource;
    /** The songs just collected for this source. */
    songs: Song[];
    musicSourceConfig?: MusicSourceImportConfig;
  }): Promise<string[] | null>;

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

/**
 * Result of a changes-only collect. `songs` are the ones to (re)import. With
 * `presentPaths` (every path currently on the source) stored songs missing
 * from it are removed; with `unchanged` nothing is removed; otherwise `songs`
 * is the full library.
 */
export interface SongChanges {
  songs: Song[];
  unchanged?: boolean;
  note?: string;
  presentPaths?: string[];
}

/** Handle to a cancellable background job (sync, add import). */
export interface IJobHandle {
  /** The background-job id, usable with `getJobService().cancelJob`. */
  jobId: string;
  /** Cancel the job (no-op if already done). */
  cancel(): void;
}
