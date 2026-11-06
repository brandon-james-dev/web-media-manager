/**
 * Minimal Open Subsonic API client.
 *
 * Handles the Open Subsonic authentication scheme on every request —
 * either `u`/`p` (plaintext password, legacy) or `u`/`t`/`s` (MD5 token,
 * recommended) — plus the mandatory `v` (api version), `c` (client id) and
 * `f=json` (JSON response) params.
 *
 * Credentials are passed per-call (read from the secret store by the
 * caller); this client never persists them.
 */
import { md5 } from "./md5";

export interface SubsonicCredentials {
  username: string;
  /** Plaintext password (converted to the `p` or `t`+`s` param). */
  password: string;
}

export interface SubsonicConfig {
  baseUrl: string;
  /** Optional Open Subsonic "music folder" scope. */
  musicFolderId?: string;
}

const API_VERSION = "1.16.1";
const CLIENT_NAME = "wmm";

/** Response envelope for the JSON endpoints. */
interface SubsonicResponse<T> {
  "subsonic-response": {
    status: "ok" | "failed";
    version: string;
    error?: { code: number; message: string };
    [key: string]: unknown;
  } & T;
}

export class SubsonicClient {
  private readonly config: SubsonicConfig;

  constructor(config: SubsonicConfig) {
    this.config = config;
  }

  get baseUrl(): string {
    return this.config.baseUrl.replace(/\/+$/, "");
  }

  /**
   * Build the auth+format query params for a request.
   * Uses the MD5 token scheme (`t`/`s`) when possible, falling back to
   * the legacy plaintext password (`p`) — both are accepted by Open
   * Subsonic servers.
   */
  private authParams(creds: SubsonicCredentials): string {
    const salt = Math.random().toString(36).slice(2, 12);
    const token = md5(creds.password + salt);
    const params = new URLSearchParams({
      u: creds.username,
      t: token,
      s: salt,
      v: API_VERSION,
      c: CLIENT_NAME,
      f: "json",
    });
    return params.toString();
  }

  /**
   * Build a fully-resolved (authenticated) URL for an Open Subsonic
   * endpoint. The extra path+params are appended to the configured base.
   */
  private buildUrl(
    endpoint: string,
    creds: SubsonicCredentials,
    extra?: Record<string, string>
  ): URL {
    const url = new URL(`${this.baseUrl}/rest/${endpoint}`);
    url.search = this.authParams(creds);
    if (extra) {
      for (const [k, v] of Object.entries(extra)) {
        if (v != null) url.searchParams.set(k, v);
      }
    }
    return url;
  }

  /**
   * Issue an authenticated GET to an Open Subsonic endpoint and return
   * the parsed `subsonic-response` payload. Throws with the server's error
   * message on an `ok: "failed"` response.
   */
  private async request<T>(
    endpoint: string,
    creds: SubsonicCredentials,
    extra?: Record<string, string>
  ): Promise<SubsonicResponse<T>> {
    const url = this.buildUrl(endpoint, creds, extra);
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`Subsonic ${endpoint} failed: HTTP ${res.status}`);
    }

    const body = (await res.json()) as SubsonicResponse<T>;
    const response = body["subsonic-response"];

    if (response.status === "failed") {
      const code = response.error?.code;
      const message = response.error?.message ?? "Unknown Open Subsonic error";
      const clipped = message.slice(0, 300);
      throw new Error(
        `Subsonic ${endpoint} failed (${code ?? "?"}): ${clipped}`
      );
    }

    return body;
  }

  /**
   * Verify the configuration + credentials against the server.
   * Returns the server version on success; throws on failure.
   */
  async ping(creds: SubsonicCredentials): Promise<string> {
    const body = await this.request<{ version: string }>("ping", creds);
    return body["subsonic-response"].version;
  }

  /** Music folders exposed by this server. */
  async getMusicFolders(
    creds: SubsonicCredentials
  ): Promise<Array<{ id: string; name: string }>> {
    const body = await this.request<{ musicFolders: { musicFolder: unknown } }>(
      "getMusicFolders",
      creds
    );
    const folder = body["subsonic-response"].musicFolders?.musicFolder;
    return (Array.isArray(folder) ? folder : []) as Array<{
      id: string;
      name: string;
    }>;
  }

  /** Root-level artist index plus any unindexed root songs. Exhaustive walk
   *  of a library starts here: each index entry feeds getArtist(); each root
   *  child is a song without an artist bucket. */
  async getIndexes(creds: SubsonicCredentials): Promise<{
    index: Array<{ id?: string; name?: string; artist?: unknown[] }>;
    child: unknown[];
  }> {
    const body = await this.request<{
      indexes: { index?: unknown; child?: unknown };
    }>(
      "getIndexes",
      creds,
      this.config.musicFolderId
        ? { musicFolderId: this.config.musicFolderId }
        : {}
    );
    const indexes = body["subsonic-response"].indexes;
    const index = Array.isArray(indexes?.index) ? indexes.index : [];
    const child = Array.isArray(indexes?.child) ? indexes.child : [];
    return {
      index: index.slice() as Array<{
        id?: string;
        name?: string;
        artist?: unknown[];
      }>,
      child,
    };
  }

  /** An artist and its albums (feed each album id into getAlbum()). */
  async getArtist(
    creds: SubsonicCredentials,
    id: string
  ): Promise<{ name?: string; album: unknown[] }> {
    const body = await this.request<{
      artist: { name?: string; album?: unknown };
    }>("getArtist", creds, { id });
    const artist = body["subsonic-response"].artist;
    return {
      name: artist?.name,
      album: Array.isArray(artist?.album) ? artist.album : [],
    };
  }

  /** An album and its songs. */
  async getAlbum(
    creds: SubsonicCredentials,
    id: string
  ): Promise<{ name?: string; song: unknown[] }> {
    const body = await this.request<{
      album: { name?: string; song?: unknown };
    }>("getAlbum", creds, { id });
    const album = body["subsonic-response"].album;
    return {
      name: album?.name,
      song: Array.isArray(album?.song) ? album.song : [],
    };
  }

  /** Albums by a browse type (`newest`, `alphabeticalByArtist`, ...). */
  async getAlbumList(
    creds: SubsonicCredentials,
    type: string,
    size = 20
  ): Promise<unknown[]> {
    const body = await this.request<{ albumList: { album: unknown } }>(
      "getAlbumList",
      creds,
      {
        type,
        size: String(size),
        ...(this.config.musicFolderId
          ? { musicFolderId: this.config.musicFolderId }
          : {}),
      }
    );
    const album = body["subsonic-response"].albumList?.album;
    return Array.isArray(album) ? album : [];
  }

  /** Playlists visible to the authenticated user (no entries). */
  async getPlaylists(
    creds: SubsonicCredentials
  ): Promise<
    Array<{ id: string; name?: string; created?: string; changed?: string }>
  > {
    const body = await this.request<{ playlists: { playlist?: unknown } }>(
      "getPlaylists",
      creds
    );
    const list = body["subsonic-response"].playlists?.playlist;
    return (Array.isArray(list) ? list : []) as Array<{
      id: string;
      name?: string;
      created?: string;
      changed?: string;
    }>;
  }

  /** One playlist with its ordered entries (songs). */
  async getPlaylist(
    creds: SubsonicCredentials,
    id: string
  ): Promise<{ entry: unknown[] }> {
    const body = await this.request<{ playlist: { entry?: unknown } }>(
      "getPlaylist",
      creds,
      { id }
    );
    const entry = body["subsonic-response"].playlist?.entry;
    return { entry: Array.isArray(entry) ? entry : [] };
  }

  /** A single song by its Open Subsonic id. */
  async getSong(creds: SubsonicCredentials, id: string): Promise<unknown> {
    const body = await this.request<{ song: unknown }>("getSong", creds, {
      id,
    });
    return body["subsonic-response"].song;
  }

  /**
   * Cover art bytes for a `coverArt` id. When `size` is omitted the server
   * returns the largest available image (full original) — the caller then
   * resizes locally into thumbnails.
   */
  async getCoverArtBytes(
    creds: SubsonicCredentials,
    coverArtId: string,
    size?: number
  ): Promise<ArrayBuffer> {
    const extra: Record<string, string> = { id: coverArtId };
    if (size != null) extra.size = String(size);
    const url = this.buildUrl("getCoverArt", creds, extra);
    const res = await fetch(url);
    if (!res.ok)
      throw new Error(`Subsonic getCoverArt failed: HTTP ${res.status}`);
    return await res.arrayBuffer();
  }

  /**
   * Streaming URL for a song/stream endpoint (authenticated). Used for
   * playback: the caller can hand this URL to an <audio> element.
   */
  async streamUrl(creds: SubsonicCredentials, id: string): Promise<string> {
    return this.buildUrl("stream", creds, { id }).toString();
  }
}
