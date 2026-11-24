import { useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Music } from "lucide-react";
import { useTranslation } from "@/i18n";
import type { ILyricLine } from "@/lib/lyrics";

/** One line of the roll, in pixels. The stack moves by exactly this much. */
const LINE_HEIGHT = 56;

export type SyncedLyricsViewProps = {
  /** Timed placements, in any order. */
  lines: ILyricLine[];
  /** Playback position, used to pick the active line. */
  cursorMs: number;
  /** Surface classes. The view is transparent unless the caller tints it. */
  className?: string;
  /** Line height in pixels, so a small preview and the playback tab can share it. */
  lineHeight?: number;
  /** Text size classes for the active and upcoming lines. */
  textClassName?: string;
};

/**
 * One slot of the roll. A slot with no lyric shows a music note instead of
 * blank space, so a gap before the first line or after the last one still
 * reads as part of the song rather than an empty box.
 */
function PreviewLine(props: {
  text: string | undefined;
  height: number;
  className: string;
  dimmed?: boolean;
}) {
  const { text, height, className, dimmed } = props;

  return (
    <div
      className={`flex items-center justify-center overflow-hidden text-center leading-snug ${
        dimmed ? "text-white/60" : "text-white"
      } ${className}`}
      style={{ height }}
    >
      {text ? (
        <p className="whitespace-pre-wrap">{text}</p>
      ) : (
        <Music
          className={`size-5 opacity-40 ${dimmed ? "" : "text-white/70"}`}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

/**
 * Timed lyrics as they play: the current line with the next one already
 * waiting below it, both at the same size. When the next line's time arrives
 * the stack rolls up by one line, so the words move rather than fade.
 *
 * This is the component the playback lyrics tab renders; the editor shows the
 * same thing at a smaller size so the preview matches what playback will do.
 */
export function SyncedLyricsView(props: SyncedLyricsViewProps) {
  const {
    lines,
    cursorMs,
    className,
    lineHeight = LINE_HEIGHT,
    textClassName = "text-2xl font-semibold",
  } = props;
  const { t } = useTranslation();

  const ordered = useMemo(
    () => [...lines].sort((a, b) => a.timeMs - b.timeMs),
    [lines]
  );

  const activeIndex = useMemo(() => {
    let index = -1;

    ordered.forEach((line, position) => {
      if (line.timeMs <= cursorMs) index = position;
    });

    return index;
  }, [ordered, cursorMs]);

  if (ordered.length === 0) {
    return (
      <div
        className={`flex min-h-0 flex-1 flex-col items-center justify-center gap-2 rounded-md border p-3 text-center text-sm text-muted-foreground ${className ?? ""}`}
      >
        <Music className="size-6 opacity-60" aria-hidden="true" />
        <p>{t("metadata.syncedLyricsPreviewEmpty")}</p>
      </div>
    );
  }

  const current = activeIndex >= 0 ? ordered[activeIndex] : undefined;
  const next = ordered[activeIndex + 1];

  return (
    <div
      className={`flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-md ${className ?? ""}`}
      style={{ height: lineHeight * 2 }}
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.div
          key={current ? `${current.timeMs}-${current.text}` : "idle"}
          initial={{ y: lineHeight }}
          animate={{ y: 0 }}
          exit={{ y: -lineHeight }}
          transition={{ duration: 0.24, ease: "easeOut" }}
          className="flex w-full flex-col"
        >
          <PreviewLine
            text={current?.text}
            height={lineHeight}
            className={textClassName}
          />
          <PreviewLine
            text={next?.text}
            height={lineHeight}
            className={textClassName}
            dimmed
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
