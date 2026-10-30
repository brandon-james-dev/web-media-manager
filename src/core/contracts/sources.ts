/**
 * MusicSource — the entity contract for "where music comes from".
 *
 * Modeled after Music Assistant's provider-registry approach: each source
 * is an *instance* (subsonic-1 ≠ subsonic-2 — one server each), carries its
 * own capability flags, and participates in the combined library by
 * priority order. Local folders (Open Subsonic "music folders") live
 * *inside* the local source; they are not entities on their own.
 *
 * JSON-safe by design: nothing here holds handles, blobs, or credentials.
 * Remote config may contain a baseUrl and a non-secret username; auth material
 * lives in the platform's secret store, never on the source entity.
 */

export type MusicSourceKind = "local" | "subsonic" | "server";

/**
 * What a source can do. The UI uses these to gate operations (e.g. never
 * offer "rescan" on a subsonic instance), and core uses them to dispatch to
 * the right adapter. Defaults per kind live with the binding that creates
 * the instance.
 */
export interface MusicSourceCapabilities {
  /** Audio can be fetched/streamed from this source. */
  streaming: boolean;
  /** The source exposes a browsable library (artists/albums/folders). */
  browsing: boolean;
  /** The source supports search queries against its own index. */
  searching: boolean;
  /** Tags/artwork can be written back through this source. */
  metadataWrite: boolean;
  /** The source's underlying storage can be (re)scanned by this app. */
  libraryScanning: boolean;
}

/** Connection settings for a remote-attached instance. Credentials stay external. */
export interface RemoteSourceConfig {
  baseUrl: string;
  /** Non-secret account name for the remote (never a password/token). */
  username?: string;
  /** Subsonic "music folder" this source is bound to, when applicable. */
  musicFolderId?: string;
}

export interface MusicSourceBase {
  /** uuidv7 — stable across edits and merges. */
  id: string;
  /** URI domain for all item ids produced by this source (@see sourceUri). */
  uriDomain: string;
  name: string;
  enabled: boolean;
  /** When the instance was added. */
  createdAt: Date;
  /** Merge order into the combined library (ascending); default 50. */
  priority: number;
  capabilities: MusicSourceCapabilities;
}

/**
 * The device's own storage — user-facing "On device". The folder(s) the
 * user picked are managed through the source's scan/browse surface; the
 * persisted record keeps the browser's directory handle (structured-cloned
 * into Dexie, as today) plus a JSON-safe path hint for non-browser bindings.
 */
export interface LocalMusicSource extends MusicSourceBase {
  kind: "local";
  /** Browser: the granted FileSystemDirectoryHandle of the chosen folder. */
  handle: FileSystemDirectoryHandle;
  /** JSON-safe display/path hint (server/Tauri: absolute path). */
  path?: string;
}

/** An Open Subsonic API server instance (one per server). */
export interface SubsonicMusicSource extends MusicSourceBase {
  kind: "subsonic";
  config: RemoteSourceConfig;
}

/** A WMM server instance (one per server). Open Subsonic is also served here. */
export interface WmmServerMusicSource extends MusicSourceBase {
  kind: "server";
  config: RemoteSourceConfig;
}

export type MusicSource =
  | LocalMusicSource
  | SubsonicMusicSource
  | WmmServerMusicSource;

/** Type guard: is this source the device's own storage ("on device")? */
export function isLocalSource(
  source: MusicSource
): source is LocalMusicSource {
  return source.kind === "local";
}

/* ------------------------------------------------------------------ */
/* Source-qualified item URIs                                          */
/*                                                                     */
/* Two subsonic servers can both vend album id "123". Combining        */
/* sources therefore requires globally unique item identity, so every   */
/* item id crossing a source boundary is namespaced: wmm://<uriDomain> */
/* /<sourceId>/<itemId>. Same scheme on every platform and survives    */
/* into the Open Subsonic surface as the id.                           */
/* ------------------------------------------------------------------ */

export const SOURCE_URI_PREFIX = "wmm://";

/** Build a globally unique, source-qualified item id. */
export function sourceUri(source: MusicSource, itemId: string): string {
  return `${SOURCE_URI_PREFIX}${source.uriDomain}/${source.id}/${itemId}`;
}

/** Decompose a source-qualified id; null when the id isn't a source URI. */
export function parseSourceUri(
  uri: string
): { uriDomain: string; sourceId: string; itemId: string } | null {
  if (!uri.startsWith(SOURCE_URI_PREFIX)) return null;
  const [uriDomain, sourceId, ...rest] = uri.slice(SOURCE_URI_PREFIX.length).split("/");
  if (!uriDomain || !sourceId || rest.length === 0) return null;
  return { uriDomain, sourceId, itemId: rest.join("/") };
}
