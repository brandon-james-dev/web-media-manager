/**
 * Offline song analysis seam.
 *
 * Live visualizers read an `AnalysisFrame` from the playing audio graph. An
 * offline analyser (precomputed per song, stored in Dexie) can satisfy the same
 * consumer by producing frames for a playback position instead. Nothing here is
 * wired yet — the port exists so the visualizer host can later take an offline
 * frame source without changing the plugin contract.
 */
export interface SongAnalysisSample {
  /** Seconds into the song. */
  time: number;
  bass: number;
  mid: number;
  treble: number;
  volume: number;
  spectrum: Float32Array;
}

export interface SongAnalysis {
  songId: string;
  /** Samples per second of the stored analysis. */
  sampleRate: number;
  duration: number;
  samples: SongAnalysisSample[];
  createdAt: number;
}

export interface SongAnalysisRepository {
  get(songId: string): Promise<SongAnalysis | undefined>;
  put(analysis: SongAnalysis): Promise<void>;
  delete(songId: string): Promise<void>;
}
