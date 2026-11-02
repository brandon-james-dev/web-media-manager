import type { MusicSource, Song } from "@/models";
import type { WorkerProgress } from "@/core/jobs";
import type { MusicSourceImportConfig } from "./config";

/** Pure collection contract (worker-safe). */

export interface IMusicSourceCollector {
  readonly kind: MusicSource["kind"];
  collectSongs(options: {
    source: MusicSource;
    isCancelled?: () => boolean;
    reportProgress?: (progress: WorkerProgress) => void;
    /** Generic source config (incl. any main-thread-resolved secret). */
    musicSourceConfig?: MusicSourceImportConfig;
  }): Promise<Song[]>;

  /**
   * Resolve the raw image bytes of a song picture for artwork processing —
   * worker-safe (no UI import). `data` is used directly when present
   * (embedded tag art); otherwise the collector resolves the source's cover
   * art at the largest available size — for Subsonic via a
   * `subsonic://coverart/<id>` URL, reading auth/secret from the generic
   * `musicSourceConfig`.
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
