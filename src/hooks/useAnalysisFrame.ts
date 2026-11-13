import { useCallback, useEffect, useRef } from "react";

import {
  AnalyserFrameSource,
  type AnalysisFrame,
} from "@/core/visualizers";
import { usePlayback } from "@/hooks/usePlayback";

/**
 * Bridges the playback analyser to `AnalysisFrame`s.
 *
 * The analyser is created lazily by the playback provider, so the source is
 * rebuilt whenever the analyser identity changes (first play, or a recreated
 * audio context). The returned reader is called from the render loop, never
 * from React state, so a 60fps visualizer causes no re-renders.
 */
export function useAnalysisFrameReader(): () => AnalysisFrame {
  const { getAnalyser, getCurrentTime, getDuration } = usePlayback();
  const sourceRef = useRef<AnalyserFrameSource | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(
    () => () => {
      sourceRef.current?.dispose();
      sourceRef.current = null;
      analyserRef.current = null;
    },
    []
  );

  return useCallback(() => {
    const analyser = getAnalyser();

    if (analyser !== analyserRef.current) {
      sourceRef.current?.dispose();
      sourceRef.current = new AnalyserFrameSource(analyser);
      analyserRef.current = analyser;
    }

    const source = sourceRef.current ?? new AnalyserFrameSource(null);
    return source.read(getCurrentTime(), getDuration());
  }, [getAnalyser, getCurrentTime, getDuration]);
}
