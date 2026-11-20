/**
 * Waveform peak extraction for the synced lyrics editor.
 *
 * The editor draws a static peak envelope rather than a live analyser: the
 * user scrubs a whole track, so the shape has to exist before playback starts.
 * Decoding happens once per song and the result is a small Float32Array.
 */

/** Peak envelope resolution. Enough detail for a wide dialog, cheap to draw. */
export const WAVEFORM_BUCKETS = 1600;

type AudioContextCtor = typeof AudioContext;

function audioContextCtor(): AudioContextCtor | undefined {
  if (typeof window === "undefined") return undefined;

  const scoped = window as Window & { webkitAudioContext?: AudioContextCtor };
  return window.AudioContext ?? scoped.webkitAudioContext;
}

/**
 * Decodes audio bytes and reduces them to a peak envelope.
 *
 * Returns `null` when the browser cannot decode the format (a codec the
 * platform lacks), so the editor can fall back to a flat track instead of
 * failing to open.
 */
export async function computeWaveformPeaks(
  bytes: ArrayBuffer,
  buckets: number = WAVEFORM_BUCKETS
): Promise<Float32Array | null> {
  const Ctor = audioContextCtor();
  if (!Ctor) return null;

  const context = new Ctor();

  try {
    // `decodeAudioData` detaches the buffer it is given, so hand it a copy.
    const audio = await context.decodeAudioData(bytes.slice(0));
    const channel = audio.getChannelData(0);
    const size = Math.max(1, Math.floor(channel.length / buckets));
    const peaks = new Float32Array(buckets);

    for (let bucket = 0; bucket < buckets; bucket++) {
      const start = bucket * size;
      const end = Math.min(start + size, channel.length);
      let peak = 0;

      for (let index = start; index < end; index++) {
        const value = Math.abs(channel[index]);
        if (value > peak) peak = value;
      }

      peaks[bucket] = peak;
    }

    return peaks;
  } catch {
    return null;
  } finally {
    void context.close();
  }
}
