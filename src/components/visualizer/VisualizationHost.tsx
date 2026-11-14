import { Maximize, Minimize, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "cn";

import type {
  PluginSettingsValues,
  VisualizationApi,
} from "@/core/visualizers";
import {
  useAnalysisFrameReader,
  useLoadedPlugin,
  usePluginSettings,
  useVisualizer,
} from "@/hooks";
import {
  createRuntimeHost,
  getVisualizerPalette,
  type VisualizerRuntimeHost,
} from "@/lib/visualizers";
import { Button } from "@/components/ui/button";
import type { VisualizationHostProps } from "./VisualizationHostProps";
import {
  adaptRenderScale,
  FRAME_SAMPLE_SIZE,
  INITIAL_RENDER_SCALE,
  type RenderScaleState,
} from "@/lib/visualizers/renderScale";

/**
 * Owns the canvas and the plugin lifecycle.
 *
 * The component renders one canvas per plugin instance (keyed), because a
 * canvas can only ever hand out one context type — switching from a Canvas 2D
 * plugin to a shader plugin must start from a fresh element. Everything that
 * runs per frame (analysis read, plugin render) stays in refs and rAF, so a
 * 60fps visualizer never re-renders React.
 */
export function VisualizationHost({
  pluginId,
  className,
  showFullscreenControl = true,
  onError,
}: VisualizationHostProps) {
  const { activePluginId, setManagerOpen } = useVisualizer();
  const resolvedPluginId = pluginId ?? activePluginId;
  const { data: loaded, error: loadError } = useLoadedPlugin(resolvedPluginId);
  const { data: settings } = usePluginSettings(resolvedPluginId);
  const readFrame = useAnalysisFrameReader();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hostRef = useRef<VisualizerRuntimeHost | null>(null);
  const readFrameRef = useRef(readFrame);
  const onErrorRef = useRef(onError);
  const settingsRef = useRef<PluginSettingsValues>(settings ?? {});
  const listenersRef = useRef(
    new Set<(values: PluginSettingsValues) => void>()
  );
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    readFrameRef.current = readFrame;
  }, [readFrame]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    settingsRef.current = settings ?? {};
    for (const listener of listenersRef.current) {
      listener(settingsRef.current);
    }
  }, [settings]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !loaded) {
      return;
    }

    setError(null);

    let disposed = false;
    let frameHandle = 0;
    const listeners = listenersRef.current;

    // Adaptive resolution: a weak GPU (a TV, an old laptop) cannot fill a
    // full-resolution canvas at 60fps, so the backing store is scaled down and
    // the browser stretches it. The CSS size never changes, so layout and the
    // plugin's coordinate space stay the same.
    let renderScale: RenderScaleState = INITIAL_RENDER_SCALE;
    const effectiveRatio = () =>
      (window.devicePixelRatio || 1) * renderScale.scale;

    const api: VisualizationApi = {
      pluginId: loaded.plugin.id,
      canvas,
      getSize: () => ({
        width: canvas.clientWidth,
        height: canvas.clientHeight,
        pixelRatio: effectiveRatio(),
      }),
      getSettings: () => settingsRef.current,
      getTheme: () =>
        document.documentElement.classList.contains("dark") ? "dark" : "light",
      getPalette: () => getVisualizerPalette(),
      log: (...args: unknown[]) => {
        console.info(`[visualizer:${loaded.plugin.id}]`, ...args);
      },
      onSettingsChange: (listener) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    };

    const host = createRuntimeHost(loaded.plugin.runtime, {
      canvas,
      api,
      manifest: loaded.plugin.manifest,
      files: loaded.files,
      entrySource: loaded.entrySource,
      vertexSource: loaded.vertexSource,
    });
    hostRef.current = host;

    const resize = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width === 0 || height === 0) {
        return;
      }
      host.resize(width, height, effectiveRatio());
      canvas.dataset.renderScale = renderScale.scale.toFixed(2);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    // A display change or browser zoom alters devicePixelRatio without changing
    // the CSS size, so the observer alone would leave a stale backing store and
    // the frame would be clipped at the old width.
    let pixelRatioQuery: MediaQueryList | null = null;
    function onPixelRatioChange() {
      resize();
      watchPixelRatio();
    }
    function watchPixelRatio() {
      pixelRatioQuery?.removeEventListener("change", onPixelRatioChange);
      pixelRatioQuery = window.matchMedia(
        `(resolution: ${window.devicePixelRatio || 1}dppx)`
      );
      pixelRatioQuery.addEventListener("change", onPixelRatioChange);
    }
    watchPixelRatio();
    window.addEventListener("resize", resize);

    let frameCount = 0;
    let lastFrameTime = 0;
    let sampleTotal = 0;
    let sampleCount = 0;

    const loop = (now: number) => {
      frameHandle = requestAnimationFrame(loop);

      // Frame pacing drives the resolution: a GPU that cannot keep up shows up
      // as rAF deltas above the budget, not as a slow render call.
      if (lastFrameTime > 0) {
        const delta = now - lastFrameTime;
        if (delta > 0 && delta < 250) {
          sampleTotal += delta;
          sampleCount += 1;
        }
      }
      lastFrameTime = now;

      if (sampleCount >= FRAME_SAMPLE_SIZE) {
        const average = sampleTotal / sampleCount;
        sampleTotal = 0;
        sampleCount = 0;

        const next = adaptRenderScale(renderScale, average);
        if (next.scale !== renderScale.scale) {
          renderScale = next;
          resize();
        } else {
          renderScale = next;
        }
      }

      // Self-heal a stale backing store: a display change or zoom can alter
      // devicePixelRatio without changing the CSS size, which the observer
      // cannot see. Checked a few times a second, not every frame.
      if (++frameCount % 15 === 0) {
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const ratio = effectiveRatio();
        if (
          width > 0 &&
          height > 0 &&
          (canvas.width !== Math.round(width * ratio) ||
            canvas.height !== Math.round(height * ratio))
        ) {
          host.resize(width, height, ratio);
        }
      }
      host.render(readFrameRef.current());
    };

    void host
      .mount()
      .then(() => {
        if (disposed) {
          return;
        }
        resize();
        frameHandle = requestAnimationFrame(loop);
      })
      .catch((cause: unknown) => {
        if (disposed) {
          return;
        }
        const message =
          cause instanceof Error ? cause.message : String(cause);
        setError(message);
        onErrorRef.current?.(
          cause instanceof Error ? cause : new Error(message)
        );
      });

    return () => {
      disposed = true;
      cancelAnimationFrame(frameHandle);
      observer.disconnect();
      window.removeEventListener("resize", resize);
      pixelRatioQuery?.removeEventListener("change", onPixelRatioChange);
      host.dispose();
      if (hostRef.current === host) {
        hostRef.current = null;
      }
    };
  }, [loaded]);

  useEffect(() => {
    const sync = () => {
      setIsFullscreen(
        containerRef.current !== null &&
          document.fullscreenElement === containerRef.current
      );
    };
    sync();
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  const canFullscreen =
    typeof document !== "undefined" && document.fullscreenEnabled;

  function toggleFullscreen() {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }

    void container.requestFullscreen?.();
  }

  const message = error ?? loadError?.message;
  const canvasKey = loaded
    ? `${loaded.plugin.id}:${loaded.plugin.updatedAt}`
    : "empty";

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative isolate overflow-hidden rounded-xl bg-black",
        className
      )}
    >
      <canvas
        key={canvasKey}
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 size-full"
      />

      {!resolvedPluginId && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
          <Sparkles className="size-6 text-white/70" />
          <p className="text-sm text-white/80">No visualizer installed.</p>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setManagerOpen(true)}
          >
            Install a visualizer
          </Button>
        </div>
      )}

      {resolvedPluginId && !loaded && !message && (
        <p className="absolute inset-0 flex items-center justify-center p-4 text-sm text-white/70">
          Loading visualizer…
        </p>
      )}

      {message && (
        <p
          role="alert"
          className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-white/80"
        >
          {message}
        </p>
      )}

      {showFullscreenControl && canFullscreen && loaded && (
        <Button
          size="icon-sm"
          variant="secondary"
          className="absolute top-2 right-2"
          title={isFullscreen ? "Exit full screen" : "Full screen"}
          aria-label={isFullscreen ? "Exit full screen" : "Full screen"}
          onClick={toggleFullscreen}
        >
          {isFullscreen ? <Minimize /> : <Maximize />}
        </Button>
      )}
    </div>
  );
}
