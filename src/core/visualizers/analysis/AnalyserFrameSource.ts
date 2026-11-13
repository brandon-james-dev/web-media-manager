import {
  ANALYSIS_FFT_SIZE,
  createAnalysisFrame,
  resetAnalysisFrame,
  type AnalysisFrame,
} from "../contracts/AnalysisFrame";

/** Frequency bands the shader/canvas plugins receive as scalar uniforms. */
const BANDS = {
  bass: [20, 250],
  mid: [250, 2000],
  treble: [2000, 8000],
} as const;

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/**
 * Turns a live `AnalyserNode` into `AnalysisFrame`s.
 *
 * Buffers and the frame itself are allocated once and reused every animation
 * frame — a visualizer runs at 60fps and must not allocate per frame. Band
 * values are smoothed asymmetrically (fast attack, slow release) so a kick drum
 * reads as a punch instead of a flicker.
 */
export class AnalyserFrameSource {
  private readonly analyser: AnalyserNode | null;
  private readonly frame: AnalysisFrame = createAnalysisFrame();
  private readonly frequencyData: Float32Array<ArrayBuffer>;
  private readonly timeData: Float32Array<ArrayBuffer>;
  private readonly binHz: number;
  private readonly minDecibels: number;
  private readonly maxDecibels: number;
  private smoothed = { bass: 0, mid: 0, treble: 0, volume: 0 };

  constructor(analyser: AnalyserNode | null) {
    this.analyser = analyser;
    const binCount = analyser?.frequencyBinCount ?? ANALYSIS_FFT_SIZE;
    this.frequencyData = new Float32Array(binCount);
    this.timeData = new Float32Array(analyser?.fftSize ?? ANALYSIS_FFT_SIZE * 2);
    this.binHz = analyser ? analyser.context.sampleRate / analyser.fftSize : 0;
    this.minDecibels = analyser?.minDecibels ?? -100;
    this.maxDecibels = analyser?.maxDecibels ?? -30;
  }

  /** Read the current frame. The returned object is reused across calls. */
  read(currentTime: number, duration: number): AnalysisFrame {
    const frame = this.frame;
    frame.currentTime = currentTime;
    frame.duration = duration;

    const analyser = this.analyser;
    if (!analyser) {
      resetAnalysisFrame(frame);
      frame.currentTime = currentTime;
      frame.duration = duration;
      return frame;
    }

    analyser.getFloatFrequencyData(this.frequencyData);
    analyser.getFloatTimeDomainData(this.timeData);

    const bins = Math.min(ANALYSIS_FFT_SIZE, this.frequencyData.length);
    for (let index = 0; index < bins; index += 1) {
      frame.spectrum[index] = this.toUnit(this.frequencyData[index]);
    }
    frame.spectrum.fill(0, bins);

    const samples = Math.min(frame.waveform.length, this.timeData.length);
    for (let index = 0; index < samples; index += 1) {
      frame.waveform[index] = this.timeData[index];
    }
    frame.waveform.fill(0, samples);

    frame.bass = this.smooth("bass", this.bandAverage(BANDS.bass));
    frame.mid = this.smooth("mid", this.bandAverage(BANDS.mid));
    frame.treble = this.smooth("treble", this.bandAverage(BANDS.treble));
    frame.volume = this.smooth("volume", this.rms());

    return frame;
  }

  /** Release references; the analyser itself is owned by the audio graph. */
  dispose(): void {
    this.smoothed = { bass: 0, mid: 0, treble: 0, volume: 0 };
  }

  private toUnit(decibels: number): number {
    if (!Number.isFinite(decibels)) {
      return 0;
    }
    return clamp01(
      (decibels - this.minDecibels) / (this.maxDecibels - this.minDecibels)
    );
  }

  private bandAverage([lowHz, highHz]: readonly [number, number]): number {
    if (this.binHz <= 0) {
      return 0;
    }

    const first = Math.max(0, Math.floor(lowHz / this.binHz));
    const last = Math.min(
      this.frame.spectrum.length - 1,
      Math.ceil(highHz / this.binHz)
    );
    if (last < first) {
      return 0;
    }

    let total = 0;
    for (let index = first; index <= last; index += 1) {
      total += this.frame.spectrum[index];
    }

    return clamp01(total / (last - first + 1));
  }

  private rms(): number {
    let sum = 0;
    for (let index = 0; index < this.timeData.length; index += 1) {
      sum += this.timeData[index] * this.timeData[index];
    }
    return clamp01(Math.sqrt(sum / this.timeData.length) * 2);
  }

  private smooth(
    band: keyof AnalyserFrameSource["smoothed"],
    next: number
  ): number {
    const previous = this.smoothed[band];
    const factor = next > previous ? 0.5 : 0.15;
    const value = previous + (next - previous) * factor;
    this.smoothed[band] = value;
    return value;
  }
}
