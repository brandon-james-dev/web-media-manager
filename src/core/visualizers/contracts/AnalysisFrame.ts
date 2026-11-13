/**
 * One frame of audio analysis, shared by every visualizer runtime.
 *
 * The frame is produced once per animation frame by the analysis layer and
 * handed to the active plugin. `spectrum` and `waveform` are reused buffers
 * owned by the producer: plugins must read them during `render()` and must
 * not retain them across frames.
 */
export const ANALYSIS_FFT_SIZE = 256;

export interface AnalysisFrame {
  /** Normalized 0..1 energy in the 20-250 Hz band. */
  bass: number;
  /** Normalized 0..1 energy in the 250-2000 Hz band. */
  mid: number;
  /** Normalized 0..1 energy in the 2000-8000 Hz band. */
  treble: number;
  /** Normalized 0..1 RMS loudness of the current frame. */
  volume: number;
  /** Normalized 0..1 magnitudes, `ANALYSIS_FFT_SIZE` bins, low to high. */
  spectrum: Float32Array;
  /** Time-domain samples in -1..1, `ANALYSIS_FFT_SIZE` samples. */
  waveform: Float32Array;
  currentTime: number;
  duration: number;
}

/** A silent frame, used before playback starts or when no analyser exists. */
export function createAnalysisFrame(): AnalysisFrame {
  return {
    bass: 0,
    mid: 0,
    treble: 0,
    volume: 0,
    spectrum: new Float32Array(ANALYSIS_FFT_SIZE),
    waveform: new Float32Array(ANALYSIS_FFT_SIZE),
    currentTime: 0,
    duration: 0,
  };
}

/** Zero a frame in place, keeping its buffers (no per-frame allocation). */
export function resetAnalysisFrame(frame: AnalysisFrame): void {
  frame.bass = 0;
  frame.mid = 0;
  frame.treble = 0;
  frame.volume = 0;
  frame.spectrum.fill(0);
  frame.waveform.fill(0);
}
