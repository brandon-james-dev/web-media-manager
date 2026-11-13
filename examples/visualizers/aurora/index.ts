import type {
  AnalysisFrame,
  PluginSettingsValues,
  VisualizationApi,
  VisualizerPalette,
  VisualizerPlugin,
} from "@/core/visualizers/contracts";

/**
 * Aurora — the bundled `canvas2d-typescript` example.
 *
 * It reproduces the now-playing backdrop in motion: artwork-colored light
 * fields, a masked dot grid, drifting translucent circles and a bottom
 * vignette, all breathing with the audio. Colors come from
 * `api.getPalette()`, the same palette the backdrop paints with.
 */
interface Settings {
  intensity: number;
  speed: number;
  dots: boolean;
  vignette: boolean;
  ribbon: boolean;
  warp: number;
}

interface Ember {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  tone: "secondary" | "tertiary" | "white";
}

interface Blob {
  color: "primary" | "secondary" | "tertiary";
  x: number;
  y: number;
  radius: number;
  driftX: number;
  driftY: number;
  phase: number;
}

const DEFAULTS: Settings = {
  intensity: 1,
  speed: 0.6,
  dots: true,
  vignette: true,
  ribbon: true,
  warp: 1,
};

const FALLBACK: VisualizerPalette = {
  primary: "#1b1030",
  secondary: "#3b1d63",
  tertiary: "#0d2a4a",
};

const DOT_SPACING = 18;

/**
 * Frequency bands, as normalized slices of the analyser spectrum. Each band
 * drives its own flame layer, so the fire shows which part of the track is
 * moving instead of one averaged shape.
 */
const BANDS = [
  { from: 0, to: 0.08 },
  { from: 0.08, to: 0.2 },
  { from: 0.2, to: 0.4 },
  { from: 0.4, to: 0.65 },
  { from: 0.65, to: 1 },
] as const;

function readSettings(values: PluginSettingsValues): Settings {
  return {
    intensity:
      typeof values.intensity === "number" ? values.intensity : DEFAULTS.intensity,
    speed: typeof values.speed === "number" ? values.speed : DEFAULTS.speed,
    dots: typeof values.dots === "boolean" ? values.dots : DEFAULTS.dots,
    vignette:
      typeof values.vignette === "boolean"
        ? values.vignette
        : DEFAULTS.vignette,
    ribbon:
      typeof values.ribbon === "boolean" ? values.ribbon : DEFAULTS.ribbon,
    warp: typeof values.warp === "number" ? values.warp : DEFAULTS.warp,
  };
}

/** Parse the CSS colors the palette produces into `rgba()` with an alpha. */
function toRgba(color: string, alpha: number): string {
  const value = color.trim();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value);
  if (hex) {
    const digits =
      hex[1].length === 3
        ? hex[1]
            .split("")
            .map((digit) => digit + digit)
            .join("")
        : hex[1];
    const r = parseInt(digits.slice(0, 2), 16);
    const g = parseInt(digits.slice(2, 4), 16);
    const b = parseInt(digits.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  const numbers = value.match(/-?[\d.]+%?/g);
  if (!numbers || numbers.length < 3) {
    return value;
  }

  if (value.startsWith("hsl")) {
    const hue = parseFloat(numbers[0]);
    const saturation = parseFloat(numbers[1]) / 100;
    const lightness = parseFloat(numbers[2]) / 100;
    const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
    const sector = ((hue % 360) + 360) % 360 / 60;
    const second = chroma * (1 - Math.abs((sector % 2) - 1));
    const match = lightness - chroma / 2;
    const [r, g, b] =
      sector < 1
        ? [chroma, second, 0]
        : sector < 2
          ? [second, chroma, 0]
          : sector < 3
            ? [0, chroma, second]
            : sector < 4
              ? [0, second, chroma]
              : sector < 5
                ? [second, 0, chroma]
                : [chroma, 0, second];
    return `rgba(${Math.round((r + match) * 255)}, ${Math.round(
      (g + match) * 255
    )}, ${Math.round((b + match) * 255)}, ${alpha})`;
  }

  return `rgba(${Math.round(parseFloat(numbers[0]))}, ${Math.round(
    parseFloat(numbers[1])
  )}, ${Math.round(parseFloat(numbers[2]))}, ${alpha})`;
}

function createPlugin(api: VisualizationApi): VisualizerPlugin {
  const canvas = api.canvas;
  const context = canvas.getContext("2d");
  let width = 0;
  let height = 0;
  let settings = readSettings(api.getSettings());
  let blobs: Blob[] = [];
  let embers: Ember[] = [];
  let elapsed = 0;
  let lastTimestamp = 0;
  let emberAccumulator = 0;
  let smoothedWave = new Float32Array(0);
  let smoothedSpectrum = new Float32Array(0);
  let pixelRatio = 1;
  let warpCanvas: HTMLCanvasElement | null = null;
  let warpContext: CanvasRenderingContext2D | null = null;
  let unsubscribe: (() => void) | null = null;

  function layout(): void {
    const shortest = Math.min(width, height) || 1;
    blobs = [
      {
        color: "tertiary",
        x: width * 0.78,
        y: height * 0.82,
        radius: shortest * 0.85,
        driftX: 0.06,
        driftY: 0.04,
        phase: 0.4,
      },
      {
        color: "secondary",
        x: width * 0.82,
        y: height * 0.18,
        radius: shortest * 0.7,
        driftX: 0.05,
        driftY: 0.07,
        phase: 2.1,
      },
      {
        color: "primary",
        x: width * 0.18,
        y: height * 0.3,
        radius: shortest * 0.95,
        driftX: 0.04,
        driftY: 0.05,
        phase: 4.3,
      },
    ];
  }

  function resize(nextWidth: number, nextHeight: number): void {
    width = nextWidth;
    height = nextHeight;
    pixelRatio = api.getSize().pixelRatio;
    context?.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    // The warp pass copies the frame into a device-pixel buffer, so it is sized
    // once per resize rather than per frame.
    if (!warpCanvas) {
      warpCanvas = document.createElement("canvas");
      warpContext = warpCanvas.getContext("2d");
    }
    const bufferWidth = Math.max(1, Math.round(width * pixelRatio));
    const bufferHeight = Math.max(1, Math.round(height * pixelRatio));
    if (warpCanvas.width !== bufferWidth) {
      warpCanvas.width = bufferWidth;
    }
    if (warpCanvas.height !== bufferHeight) {
      warpCanvas.height = bufferHeight;
    }

    layout();
  }

  function paintBlob(
    blob: Blob,
    palette: VisualizerPalette,
    energy: number
  ): void {
    if (!context) {
      return;
    }

    const drift = elapsed * settings.speed;
    const x =
      blob.x + Math.sin(drift * 0.35 + blob.phase) * width * blob.driftX;
    const y =
      blob.y + Math.cos(drift * 0.28 + blob.phase) * height * blob.driftY;
    const radius = blob.radius * (1 + energy * 0.28 * settings.intensity);
    const color = palette[blob.color];

    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, toRgba(color, 0.85));
    gradient.addColorStop(0.45, toRgba(color, 0.42));
    gradient.addColorStop(1, toRgba(color, 0));

    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  function paintHighlight(): void {
    if (!context) {
      return;
    }

    const x = width * 0.42;
    const y = height * 0.12;
    const radius = Math.max(width, height) * 0.7;
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, "rgba(255, 255, 255, 0.26)");
    gradient.addColorStop(0.55, "rgba(255, 255, 255, 0)");

    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  }

  function paintDots(frame: AnalysisFrame): void {
    if (!context) {
      return;
    }

    const centerX = width / 2;
    const centerY = height / 2;
    const reach = Math.hypot(centerX, centerY) || 1;
    const size = 1.5;

    for (let y = DOT_SPACING; y < height; y += DOT_SPACING) {
      for (let x = DOT_SPACING; x < width; x += DOT_SPACING) {
        const distance = Math.hypot(x - centerX, y - centerY) / reach;
        const mask = Math.max(0, 1 - distance / 0.75);
        if (mask <= 0.01) {
          continue;
        }

        const bin = Math.min(
          frame.spectrum.length - 1,
          Math.max(0, Math.floor((x / width) * frame.spectrum.length))
        );
        const magnitude = frame.spectrum[bin] ?? 0;
        const alpha = mask * (0.12 + magnitude * 0.5 + frame.treble * 0.12);

        context.fillStyle = `rgba(255, 255, 255, ${Math.min(0.85, alpha)})`;
        context.fillRect(x - size / 2, y - size / 2, size, size);
      }
    }
  }

  function paintCircles(): void {
    if (!context) {
      return;
    }

    const shortest = Math.min(width, height) || 1;
    const drift = elapsed * settings.speed;
    const circles = [
      { x: 0.22, y: 0.68, size: 0.42, tone: "rgba(255, 255, 255, 0.10)", phase: 0.8 },
      { x: 0.74, y: 0.32, size: 0.5, tone: "rgba(0, 0, 0, 0.15)", phase: 3.4 },
      { x: 0.55, y: 0.78, size: 0.24, tone: "rgba(255, 255, 255, 0.05)", phase: 5.2 },
    ];

    for (const circle of circles) {
      const x =
        width * circle.x + Math.sin(drift * 0.22 + circle.phase) * width * 0.04;
      const y =
        height * circle.y + Math.cos(drift * 0.19 + circle.phase) * height * 0.03;
      const radius = shortest * circle.size;

      const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, circle.tone);
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

      context.fillStyle = gradient;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    }
  }

  function paintVignette(): void {
    if (!context) {
      return;
    }

    const gradient = context.createLinearGradient(0, height * 0.4, 0, height);
    gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.55)");

    context.fillStyle = gradient;
    context.fillRect(0, height * 0.4, width, height * 0.6);
  }

  /**
   * Ease the incoming analysis into persistent buffers. Raw analyser output
   * changes every frame; without this the ribbon and the warp jitter instead of
   * flowing.
   */
  function updateAnalysis(frame: AnalysisFrame, delta: number): void {
    if (smoothedWave.length !== frame.waveform.length) {
      smoothedWave = new Float32Array(frame.waveform.length);
    }
    if (smoothedSpectrum.length !== frame.spectrum.length) {
      smoothedSpectrum = new Float32Array(frame.spectrum.length);
    }

    // Fast attack, slow release: transients punch through so the track's
    // dynamics stay readable, while decay stays smooth enough not to flicker.
    const waveAttack = Math.min(1, delta * 26);
    const waveRelease = Math.min(1, delta * 5);
    const spectrumAttack = Math.min(1, delta * 18);
    const spectrumRelease = Math.min(1, delta * 4);

    for (let i = 0; i < smoothedWave.length; i++) {
      const target = frame.waveform[i] ?? 0;
      const ease = Math.abs(target) > Math.abs(smoothedWave[i])
        ? waveAttack
        : waveRelease;
      smoothedWave[i] += (target - smoothedWave[i]) * ease;
    }
    for (let i = 0; i < smoothedSpectrum.length; i++) {
      const target = frame.spectrum[i] ?? 0;
      const ease = target > smoothedSpectrum[i]
        ? spectrumAttack
        : spectrumRelease;
      smoothedSpectrum[i] += (target - smoothedSpectrum[i]) * ease;
    }
  }

  function sampleWave(t: number): number {
    if (smoothedWave.length === 0) {
      return 0;
    }
    const index = Math.min(
      smoothedWave.length - 1,
      Math.max(0, Math.floor(t * smoothedWave.length))
    );
    return smoothedWave[index] ?? 0;
  }

  function sampleSpectrum(t: number): number {
    if (smoothedSpectrum.length === 0) {
      return 0;
    }
    const index = Math.min(
      smoothedSpectrum.length - 1,
      Math.max(0, Math.floor(t * smoothedSpectrum.length))
    );
    return smoothedSpectrum[index] ?? 0;
  }

  /**
   * Heat haze: copy the painted background, then blit it back in narrow columns
   * shifted vertically by the waveform. Five stacked bands carry decreasing
   * displacement, so the distortion fades out instead of ending on a seam.
   */
  function paintWarp(): void {
    if (!context || !warpCanvas || !warpContext || settings.warp <= 0) {
      return;
    }

    const centerY = height * 0.5;
    const bandHeight = height * 0.34;
    const bandTop = centerY - bandHeight / 2;
    const amplitude = Math.min(height * 0.09, 56) * settings.warp;
    const slice = Math.max(2, Math.round(width / 220));
    const bandScales = [0.18, 0.5, 1, 0.5, 0.18];
    const bandSlice = bandHeight / bandScales.length;
    // One energy read per band per frame; the warp interpolates between them.
    const energies = BANDS.map((_, index) => bandEnergy(index));

    warpContext.setTransform(1, 0, 0, 1, 0, 0);
    warpContext.clearRect(0, 0, warpCanvas.width, warpCanvas.height);
    warpContext.drawImage(canvas, 0, 0);

    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);

    for (let band = 0; band < bandScales.length; band++) {
      const top = bandTop + band * bandSlice;
      const scale = bandScales[band];

      for (let x = 0; x < width; x += slice) {
        const t = x / width;
        const wave = sampleWave(t);
        const heat = heatAt(t, energies);
        const drift = Math.sin(elapsed * 1.6 + t * 7) * 0.3;
        const offset = (wave * 1.4 + heat * 1.6 + drift) * amplitude * scale;

        // Draw in device pixels so every strip lands on whole pixels: a
        // fractional ratio would otherwise resample each strip edge and leave a
        // hairline seam between them.
        const dx = Math.round(x * pixelRatio);
        const dy = Math.round((top + offset) * pixelRatio);
        const dw = Math.round((x + slice) * pixelRatio) - dx;
        const dh = Math.round((top + bandSlice) * pixelRatio) - dy;

        context.drawImage(
          warpCanvas,
          dx,
          Math.round(top * pixelRatio),
          dw,
          dh,
          dx,
          dy,
          dw,
          dh
        );
      }
    }

    context.restore();
  }

  function bandEnergy(index: number): number {
    const band = BANDS[index];
    if (!band || smoothedSpectrum.length === 0) {
      return 0;
    }

    const start = Math.floor(band.from * smoothedSpectrum.length);
    const end = Math.max(
      start + 1,
      Math.min(smoothedSpectrum.length, Math.floor(band.to * smoothedSpectrum.length))
    );

    let sum = 0;
    for (let i = start; i < end; i++) {
      sum += smoothedSpectrum[i] ?? 0;
    }

    // A band's average bin level is small; lift it so a quiet band still shows a
    // low flame and a loud one towers.
    const average = sum / Math.max(1, end - start);
    return Math.pow(Math.min(1, average * 2.4), 1.35);
  }

  /**
   * Band energy at a horizontal position, interpolated between band centers.
   * A step function here would jump the warp offset at every band boundary and
   * leave a hard vertical seam across the band.
   */
  function heatAt(t: number, energies: number[]): number {
    const centers = BANDS.map((band) => (band.from + band.to) / 2);
    if (t <= centers[0]) {
      return energies[0] ?? 0;
    }
    for (let i = 1; i < centers.length; i++) {
      if (t <= centers[i]) {
        const span = centers[i] - centers[i - 1];
        const k = span > 0 ? (t - centers[i - 1]) / span : 0;
        return (energies[i - 1] ?? 0) * (1 - k) + (energies[i] ?? 0) * k;
      }
    }
    return energies[energies.length - 1] ?? 0;
  }

  function firePoints(
    bandIndex: number,
    x0: number,
    slotWidth: number,
    amplitude: number,
    phase: number,
    offsetY: number
  ): { x: number; y: number; heat: number }[] {
    const centerY = height * 0.5 + offsetY;
    const columns = Math.max(24, Math.min(90, Math.round(slotWidth / 5)));
    const heat = bandEnergy(bandIndex);
    const points: { x: number; y: number; heat: number }[] = [];

    for (let i = 0; i < columns; i++) {
      const local = i / (columns - 1);
      // Every layer sweeps the whole waveform, shifted by its own phase, so the
      // back layers travel as far as the front instead of reading one narrow
      // slice of the wave.
      const t = (local + bandIndex * 0.19) % 1;
      const wave = sampleWave(t);
      const flicker =
        Math.sin(elapsed * 0.9 + i * 0.4 + phase) * 0.1 +
        Math.sin(elapsed * 1.7 + i * 0.13 + phase) * 0.05;

      points.push({
        x: x0 + local * slotWidth,
        y:
          centerY -
          (wave * 1.1 + flicker * (0.3 + heat) + heat * 0.9) * amplitude,
        heat,
      });
    }

    return points;
  }

  function paintFires(
    frame: AnalysisFrame,
    palette: VisualizerPalette
  ): void {
    if (!context || !settings.ribbon) {
      return;
    }

    const centerY = height * 0.5;
    const base =
      Math.min(height * 0.2, 190) *
      (0.3 + (frame.volume * 0.45 + frame.bass * 0.4 + frame.mid * 0.25) * 1.4) *
      settings.intensity;

    context.save();
    context.globalCompositeOperation = "lighter";

    // Layered, not side by side: every band spans the full width, each one
    // lifted slightly higher and drawn a little smaller, so the flames stack
    // into one fire with readable band structure.
    for (let band = 0; band < BANDS.length; band++) {
      const energy = bandEnergy(band);
      const amplitude = base * (0.26 + energy * 1.4) * (1 - band * 0.07);
      const depth = amplitude * 1.15;
      const thickness = Math.max(10, amplitude * 1.15);
      const offsetY =
        (band - (BANDS.length - 1) / 2) * height * 0.012;

      // Three offset passes read as licking flame edges rather than one clean line.
      for (let pass = 0; pass < 3; pass++) {
        const alpha = pass === 0 ? 0.55 : 0.24 - pass * 0.08;
        const points = firePoints(
          band,
          0,
          width,
          amplitude * (1 - pass * 0.22),
          pass * 2.1 + band * 1.7,
          offsetY
        );

        context.beginPath();
        context.moveTo(points[0].x, points[0].y);
        for (const point of points) {
          context.lineTo(point.x, point.y);
        }
        for (let i = points.length - 1; i >= 0; i--) {
          const point = points[i];
          context.lineTo(
            point.x,
            centerY + offsetY + depth * (0.34 + point.heat * 0.66)
          );
        }
        context.closePath();

        const gradient = context.createLinearGradient(
          0,
          centerY + offsetY - thickness,
          0,
          centerY + offsetY + depth
        );
        gradient.addColorStop(0, toRgba(palette.secondary, 0));
        gradient.addColorStop(0.32, toRgba(palette.secondary, 0.22 * alpha));
        gradient.addColorStop(0.55, `rgba(255, 255, 255, ${0.24 * alpha})`);
        gradient.addColorStop(0.76, toRgba(palette.tertiary, 0.22 * alpha));
        gradient.addColorStop(1, toRgba(palette.tertiary, 0));

        context.fillStyle = gradient;
        context.fill();

        context.beginPath();
        context.moveTo(points[0].x, points[0].y);
        for (const point of points) {
          context.lineTo(point.x, point.y);
        }
        context.strokeStyle = `rgba(255, 255, 255, ${0.22 * alpha})`;
        context.lineWidth = 1.4;
        context.stroke();
      }
    }

    context.restore();
  }

  function paintEmbers(
    frame: AnalysisFrame,
    palette: VisualizerPalette
  ): void {
    if (!context) {
      return;
    }

    const centerY = height * 0.5;
    const energy = frame.volume * 0.6 + frame.bass * 0.7;
    const tones: Ember["tone"][] = ["secondary", "tertiary", "white"];

    // Spawn on a time accumulator rather than per frame, so the ember rate does
    // not depend on the refresh rate and does not pop.
    emberAccumulator += (6 + energy * 34) / 60;
    while (emberAccumulator >= 1) {
      emberAccumulator -= 1;
      const t = Math.random();
      const magnitude = sampleSpectrum(t);

      embers.push({
        x: t * width,
        y: centerY + (Math.random() - 0.5) * height * 0.05,
        vx: (Math.random() - 0.5) * 8,
        vy: 16 + Math.random() * 34 + energy * 46,
        life: 1,
        maxLife: 1.1 + Math.random() * 1.6,
        size: 0.8 + Math.random() * 1.6 + magnitude * 1.2,
        tone: tones[Math.floor(Math.random() * tones.length)],
      });
    }

    context.save();
    context.globalCompositeOperation = "lighter";

    const delta = 1 / 60;
    embers = embers.filter((ember) => {
      ember.life -= delta / ember.maxLife;
      if (ember.life <= 0) {
        return false;
      }

      ember.x += ember.vx * delta;
      ember.y -= ember.vy * delta;
      ember.vy *= 0.995;

      const fade =
        Math.min(1, (1 - ember.life) * 5) * Math.min(1, ember.life * 2.5);
      const alpha = fade * 0.5;
      const tint =
        ember.tone === "white" ? null : toRgba(palette[ember.tone], alpha);
      context.fillStyle = tint ?? `rgba(255, 255, 255, ${alpha})`;
      context.beginPath();
      context.arc(ember.x, ember.y, ember.size, 0, Math.PI * 2);
      context.fill();
      return true;
    });

    context.restore();
  }

  function render(frame: AnalysisFrame): void {
    if (!context || width === 0 || height === 0) {
      return;
    }

    const now = performance.now();
    const delta =
      lastTimestamp === 0
        ? 1 / 60
        : Math.min(0.1, Math.max(0.001, (now - lastTimestamp) / 1000));
    lastTimestamp = now;
    elapsed += delta;
    updateAnalysis(frame, delta);

    const palette = api.getPalette() ?? FALLBACK;
    const energy = frame.bass * 0.6 + frame.mid * 0.25 + frame.volume * 0.35;

    context.fillStyle = palette.primary;
    context.fillRect(0, 0, width, height);

    for (const blob of blobs) {
      paintBlob(blob, palette, energy);
    }

    paintHighlight();
    paintCircles();

    if (settings.dots) {
      paintDots(frame);
    }

    if (settings.vignette) {
      paintVignette();
    }

    paintWarp();
    paintFires(frame, palette);
    paintEmbers(frame, palette);
  }

  return {
    async initialize(): Promise<void> {
      settings = readSettings(api.getSettings());
      unsubscribe = api.onSettingsChange((values) => {
        settings = readSettings(values);
      });
    },
    render,
    resize,
    dispose(): void {
      unsubscribe?.();
      unsubscribe = null;
      blobs = [];
      embers = [];
      warpCanvas = null;
      warpContext = null;
      context?.clearRect(0, 0, width, height);
    },
  };
}

export { createPlugin };
export default createPlugin;
