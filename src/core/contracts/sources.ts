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
  /** The source can persist playlists (local: .m3u file; remote: its API). */
  playlistWrite: boolean;
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
  /** Browser: the granted FileSystemDirectoryHandle of the first folder. */
  handle: FileSystemDirectoryHandle;
  /**
   * Every folder the source reads, `handle` first. Absent on sources saved
   * before multi-folder support; use `localSourceFolders()` to read.
   */
  handles?: FileSystemDirectoryHandle[];
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
  LocalMusicSource | SubsonicMusicSource | WmmServerMusicSource;

/** Display name of a local source: its folder, or "first +N" for several. */
export function localSourceName(
  folders: Pick<FileSystemDirectoryHandle, "name">[]
): string {
  const [first, ...rest] = folders;
  return rest.length ? `${first.name} +${rest.length}` : first.name;
}

/** All folders of a local source (older records only carry `handle`). */
export function localSourceFolders(
  source: Pick<LocalMusicSource, "handle" | "handles">
): FileSystemDirectoryHandle[] {
  return source.handles?.length ? source.handles : [source.handle];
}

/**
 * Locate the folder a local song lives in and the path inside it.
 *
 * A single-folder source stores plain relative paths. With several folders
 * each song's path starts with its folder's name (names are unique within a
 * source). Paths saved before a second folder was added have no such prefix
 * and belong to the first folder, so an unmatched prefix falls back to it.
 */
export function resolveLocalSongFolder(
  source: Pick<LocalMusicSource, "handle" | "handles">,
  relativePath: string
): { folder: FileSystemDirectoryHandle; path: string } {
  const folders = localSourceFolders(source);
  if (folders.length > 1) {
    const [first, ...rest] = relativePath.split("/");
    const match = folders.find((f) => f.name === first);
    if (match && rest.length > 0)
      return { folder: match, path: rest.join("/") };
  }
  return { folder: folders[0], path: relativePath };
}

/** Type guard: is this source the device's own storage ("on device")? */
export function isLocalSource(source: MusicSource): source is LocalMusicSource {
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
  const [uriDomain, sourceId, ...rest] = uri
    .slice(SOURCE_URI_PREFIX.length)
    .split("/");
  if (!uriDomain || !sourceId || rest.length === 0) return null;
  return { uriDomain, sourceId, itemId: rest.join("/") };
}
