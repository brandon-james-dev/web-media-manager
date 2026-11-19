import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";
import { cn } from "cn";

/**
 * How much one arrow key press moves the value, matching the remote-control
 * step the playback page documents.
 *
 * @example
 * ```xml
 * <VolumeControl orientation="vertical" height="120" />
 * ```
 * @example
 * ```ts
 * SLIDER_STEP; // 0.05
 * ```
 */
const SLIDER_STEP = 0.05;

/** The thumb's size, read from the slider style with a 12 px fallback. */
const THUMB_SIZE = "var(--wmm-slider-thumb-size, 12px)";

/**
 * What a themed slider needs: the value as a 0–1 fraction, the callback that
 * receives every change, and the accessible name.
 *
 * @example
 * ```xml
 * <SeekBar slider="@slider/seek" />
 * ```
 * @example
 * ```ts
 * const props: ThemeSliderProps = { value: 0.4, onChange: seek, label: "Seek" };
 * ```
 */
export interface ThemeSliderProps {
  /** The current value, 0–1. */
  readonly value: number;
  /** Called with the new 0–1 value on every change. */
  readonly onChange: (value: number) => void;
  /** The accessible name of the slider. */
  readonly label: string;
  /** Whether the slider runs along the inline or the block axis. */
  readonly orientation?: "horizontal" | "vertical";
  /** The track thickness used when the theme sets none, in pixels. */
  readonly thickness?: number;
  /** Whether to draw the thumb; the `edge` seek variant hides it. */
  readonly showThumb?: boolean;
  /** The buffered share of the track, 0–1, when the host knows it. */
  readonly buffer?: number;
  /** Whether the slider ignores input. */
  readonly disabled?: boolean;
  /** Extra classes for the slider root. */
  readonly className?: string;
  /** Extra declarations for the slider root. */
  readonly style?: CSSProperties;
}

/**
 * A slider that paints itself from the `--wmm-slider-*` custom properties a
 * theme slider style writes, and from palette colors when the theme sets
 * none. It is a plain `role="slider"` element rather than a component-library
 * slider, because the parts have to read those properties.
 *
 * @example
 * ```xml
 * <SliderStyle id="seek" thickness="4" track="@slot/progressTrack" thumb="round" />
 * ```
 * @example
 * ```tsx
 * <ThemeSlider value={0.4} onChange={seek} label="Seek" thickness={4} />
 * ```
 */
export function ThemeSlider({
  value,
  onChange,
  label,
  orientation = "horizontal",
  thickness = 4,
  showThumb = true,
  buffer,
  disabled = false,
  className,
  style,
}: ThemeSliderProps) {
  const vertical = orientation === "vertical";
  const current = Math.min(1, Math.max(0, value));

  function valueAt(event: PointerEvent<HTMLDivElement>): number {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return current;
    const ratio = vertical
      ? 1 - (event.clientY - rect.top) / rect.height
      : (event.clientX - rect.left) / rect.width;
    return Math.min(1, Math.max(0, ratio));
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>): void {
    if (disabled) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    onChange(valueAt(event));
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>): void {
    if (disabled) return;
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    onChange(valueAt(event));
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>): void {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (disabled) return;
    const step = event.shiftKey ? SLIDER_STEP * 2 : SLIDER_STEP;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      onChange(Math.min(1, current + step));
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      onChange(Math.max(0, current - step));
    } else if (event.key === "Home") {
      event.preventDefault();
      onChange(0);
    } else if (event.key === "End") {
      event.preventDefault();
      onChange(1);
    }
  }

  return (
    <div
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      aria-orientation={vertical ? "vertical" : "horizontal"}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(current * 100)}
      aria-disabled={disabled || undefined}
      data-orientation={vertical ? "vertical" : "horizontal"}
      className={cn(
        "relative flex touch-none items-center outline-none select-none",
        vertical ? "h-full w-full flex-col justify-center" : "w-full",
        className
      )}
      style={{
        opacity: "var(--wmm-slider-opacity, 1)",
        ...(showThumb
          ? vertical
            ? { minWidth: "var(--wmm-slider-thumb-size, 12px)" }
            : { minHeight: "var(--wmm-slider-thumb-size, 12px)" }
          : {}),
        ...style,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
    >
      <div
        className={cn(
          "relative overflow-hidden",
          vertical ? "h-full w-full" : "w-full"
        )}
        style={{
          height: vertical
            ? undefined
            : `var(--wmm-slider-thickness, ${thickness}px)`,
          width: vertical
            ? `var(--wmm-slider-thickness, ${thickness}px)`
            : undefined,
          borderRadius: "var(--wmm-slider-radius, 999px)",
          background: "var(--wmm-slider-track, var(--muted))",
          border: "1px solid var(--wmm-slider-border, transparent)",
        }}
      >
        {buffer === undefined ? null : (
          <div
            className="absolute inset-y-0 left-0"
            style={{
              width: `${Math.min(1, Math.max(0, buffer)) * 100}%`,
              background: "var(--wmm-slider-buffer, transparent)",
            }}
          />
        )}
        <div
          className="absolute"
          style={
            vertical
              ? {
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: `${current * 100}%`,
                  background: "var(--wmm-slider-fill, var(--accent))",
                }
              : {
                  top: 0,
                  bottom: 0,
                  left: 0,
                  width: `${current * 100}%`,
                  background: "var(--wmm-slider-fill, var(--accent))",
                }
          }
        />
      </div>
      {showThumb ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute rounded-full"
          style={
            vertical
              ? {
                  bottom: `calc((100% - ${THUMB_SIZE}) * ${current})`,
                  left: "50%",
                  transform: "translateX(-50%)",
                  ...thumbStyle(),
                }
              : {
                  left: `calc((100% - ${THUMB_SIZE}) * ${current})`,
                  top: "50%",
                  transform: "translateY(-50%)",
                  ...thumbStyle(),
                }
          }
        />
      ) : null}
    </div>
  );
}

/** The thumb's size and paint, read from the slider style's properties. */
function thumbStyle(): CSSProperties {
  const size = THUMB_SIZE;
  return {
    width: size,
    height: size,
    background:
      "var(--wmm-slider-thumb-image, var(--wmm-slider-fill, var(--primary)))",
    backgroundSize: "contain",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
    boxShadow: "0 1px 2px rgb(0 0 0 / 0.35)",
  };
}
