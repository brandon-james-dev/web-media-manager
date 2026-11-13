import { useEffect, useState } from "react";
import { getPictureOfType } from "@/core/media";
import { ThumbnailSize } from "@/lib";

export interface ArtworkPalette {
  primary: string;
  secondary: string;
  tertiary: string;
}

const SAMPLE = 24;

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
}

function toCss([h, s, l]: [number, number, number]) {
  return `hsl(${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`;
}

export function paletteFromPixels(
  data: Uint8ClampedArray
): ArtworkPalette | null {
  const buckets = new Map<
    number,
    { w: number; r: number; g: number; b: number }
  >();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
    if (l < 0.08 || l > 0.95) continue;
    const key = Math.floor(h / 30) * 4 + Math.min(3, Math.floor(s * 4));
    const weight = 0.2 + s;
    const b = buckets.get(key) ?? { w: 0, r: 0, g: 0, b: 0 };
    b.w += weight;
    b.r += data[i] * weight;
    b.g += data[i + 1] * weight;
    b.b += data[i + 2] * weight;
    buckets.set(key, b);
  }
  const ranked = [...buckets.values()].sort((a, b) => b.w - a.w);
  if (ranked.length === 0) return null;
  const colors = ranked.slice(0, 3).map((b) => {
    const [h, s, l] = rgbToHsl(b.r / b.w, b.g / b.w, b.b / b.w);
    return toCss([h, Math.min(1, s * 1.1), Math.min(0.5, Math.max(0.25, l))]);
  });
  return {
    primary: colors[0],
    secondary: colors[1] ?? colors[0],
    tertiary: colors[2] ?? colors[1] ?? colors[0],
  };
}

export function useArtworkPalette(
  songId: string | undefined,
  enabled: boolean
) {
  const [palette, setPalette] = useState<ArtworkPalette | null>(null);

  useEffect(() => {
    if (!songId || !enabled) {
      setPalette(null);
      return;
    }
    let cancelled = false;
    let url: string | null = null;

    (async () => {
      const picture = await getPictureOfType(
        songId,
        undefined,
        ThumbnailSize.thumb64
      );
      if (cancelled || !picture?.data) {
        if (!cancelled) setPalette(null);
        return;
      }
      url = URL.createObjectURL(new Blob([picture.data.slice()]));
      const img = new Image();
      img.onload = () => {
        if (cancelled) return;
        const canvas = document.createElement("canvas");
        canvas.width = SAMPLE;
        canvas.height = SAMPLE;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, SAMPLE, SAMPLE);
        setPalette(
          paletteFromPixels(ctx.getImageData(0, 0, SAMPLE, SAMPLE).data)
        );
      };
      img.onerror = () => {
        if (!cancelled) setPalette(null);
      };
      img.src = url;
    })();

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [songId, enabled]);

  return palette;
}
