import { useMemo } from "react";
import { Disc3, Music, Music4 } from "lucide-react";
import type { ArtworkPalette } from "./useArtworkPalette";

interface NowPlayingBackdropProps {
  palette: ArtworkPalette | null;
  seed: string;
}

function seededRandom(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function layoutFor(seed: string) {
  const rand = seededRandom(seed);
  const between = (min: number, max: number) => min + rand() * (max - min);
  const circle = (min: number, max: number, blur: number) => {
    const size = between(min, max);
    return {
      width: size,
      height: size,
      left: `${between(-10, 90)}%`,
      top: `${between(-10, 90)}%`,
      filter: blur > 0 ? `blur(${blur}px)` : undefined,
    };
  };
  const icon = () => ({
    left: `${between(4, 88)}%`,
    top: `${between(8, 86)}%`,
    transform: `rotate(${Math.round(between(-30, 30))}deg)`,
    width: between(24, 56),
    height: between(24, 56),
  });
  return {
    highlight: `${Math.round(between(0, 100))}% ${Math.round(between(0, 40))}%`,
    glowA: `${Math.round(between(60, 100))}% ${Math.round(between(60, 100))}%`,
    glowB: `${Math.round(between(60, 100))}% ${Math.round(between(0, 40))}%`,
    circleLight: circle(180, 340, 14),
    circleDark: circle(220, 420, 36),
    circleSmall: circle(90, 180, 0),
    circleFar: circle(140, 260, 22),
    circleNear: circle(60, 120, 6),
    music: icon(),
    music4: icon(),
    disc: icon(),
  };
}

export function NowPlayingBackdrop({ palette, seed }: NowPlayingBackdropProps) {
  const primary = palette?.primary ?? "var(--accent)";
  const secondary = palette?.secondary ?? "var(--accent)";
  const tertiary = palette?.tertiary ?? "var(--accent)";
  const layout = useMemo(() => layoutFor(seed), [seed]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden transition-colors duration-700"
      style={{
        backgroundColor: primary,
        backgroundImage: `radial-gradient(circle at ${layout.highlight}, rgb(255 255 255 / 0.28), transparent 55%), radial-gradient(circle at ${layout.glowA}, ${tertiary}, transparent 60%), radial-gradient(circle at ${layout.glowB}, ${secondary}, transparent 55%), linear-gradient(to bottom, transparent 40%, rgb(0 0 0 / 0.55))`,
      }}
    >
      <div className="absolute inset-0 text-white opacity-[0.12] bg-[radial-gradient(circle,currentColor_1px,transparent_1.5px)] bg-size-[18px_18px] mask-[radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      <div
        className="absolute rounded-full bg-white/10"
        style={layout.circleLight}
      />
      <div
        className="absolute rounded-full bg-black/15"
        style={layout.circleDark}
      />
      <div
        className="absolute rounded-full bg-white/5"
        style={layout.circleSmall}
      />
      <Music className="absolute opacity-20" style={layout.music} />
      <Music4 className="absolute opacity-20" style={layout.music4} />
      <Disc3 className="absolute opacity-20" style={layout.disc} />
    </div>
  );
}
