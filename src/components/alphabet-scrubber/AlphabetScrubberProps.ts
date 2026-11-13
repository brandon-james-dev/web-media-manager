export interface AlphabetScrubberProps {
  availableLetters: ReadonlySet<string>;
  onSelect: (letter: string) => void;
  side?: "left" | "right";
  className?: string;
  autoHide?: boolean;
  /** Stay hidden until the pointer is over the strip (desktop). */
  hoverOnly?: boolean;
  /** Letters run Z to A, matching a descending list. */
  reversed?: boolean;
  scrollRef?: React.RefObject<HTMLElement | null>;
}
