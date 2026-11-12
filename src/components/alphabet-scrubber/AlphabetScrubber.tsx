import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/shadcn-utils/utils";
import { ALPHABET_LETTERS } from "@/lib/alphabet";
import type { AlphabetScrubberProps } from "./AlphabetScrubberProps";

const HIDE_DELAY_MS = 1500;

export function AlphabetScrubber({
  availableLetters,
  onSelect,
  side = "right",
  className,
  autoHide = false,
  scrollRef,
}: AlphabetScrubberProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const lastSelectedRef = useRef<string | null>(null);
  const [scrub, setScrub] = useState<{ letter: string; y: number } | null>(
    null
  );
  const [showBubble, setShowBubble] = useState(false);
  const [recentlyScrolled, setRecentlyScrolled] = useState(false);

  useEffect(() => {
    if (!autoHide) return;
    const viewport = scrollRef?.current?.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]'
    );
    if (!viewport) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      setRecentlyScrolled(true);
      clearTimeout(timer);
      timer = setTimeout(() => setRecentlyScrolled(false), HIDE_DELAY_MS);
    };
    viewport.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      viewport.removeEventListener("scroll", onScroll);
      clearTimeout(timer);
    };
  }, [autoHide, scrollRef]);

  const visible = !autoHide || recentlyScrolled || scrub !== null;

  function update(e: React.PointerEvent<HTMLDivElement>) {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const y = Math.min(Math.max(e.clientY - rect.top, 0), rect.height);
    const i = Math.min(
      ALPHABET_LETTERS.length - 1,
      Math.floor((y / rect.height) * ALPHABET_LETTERS.length)
    );
    const letter = ALPHABET_LETTERS[i];
    setScrub({ letter, y });
    if (availableLetters.has(letter) && lastSelectedRef.current !== letter) {
      lastSelectedRef.current = letter;
      onSelect(letter);
    }
  }

  function end() {
    lastSelectedRef.current = null;
    setScrub(null);
    setShowBubble(false);
  }

  return (
    <div
      className={cn(
        "absolute inset-y-0 z-20 flex items-center py-2 transition-opacity duration-300",
        !visible && "pointer-events-none opacity-0",
        side === "right" ? "right-0" : "left-0",
        className
      )}
    >
      <div
        ref={trackRef}
        role="group"
        aria-label="Alphabet index"
        className="relative flex h-full max-h-136 w-6 touch-none flex-col rounded-full bg-background/40 select-none"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setShowBubble(e.pointerType !== "mouse");
          update(e);
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) update(e);
        }}
        onPointerUp={end}
        onPointerCancel={end}
      >
        {ALPHABET_LETTERS.map((letter) => (
          <div
            key={letter}
            className={cn(
              "flex min-h-0 flex-1 items-center justify-center text-[10px] leading-none font-semibold",
              availableLetters.has(letter)
                ? "text-foreground"
                : "text-muted-foreground/30",
              scrub?.letter === letter && "text-accent"
            )}
          >
            {letter}
          </div>
        ))}

        {scrub && showBubble && (
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute flex size-16 -translate-y-1/2 items-center justify-center rounded-2xl bg-accent text-4xl font-bold text-accent-foreground shadow-lg",
              side === "right" ? "right-full mr-10" : "left-full ml-10",
              !availableLetters.has(scrub.letter) && "opacity-50"
            )}
            style={{ top: scrub.y }}
          >
            {scrub.letter}
          </div>
        )}
      </div>
    </div>
  );
}
