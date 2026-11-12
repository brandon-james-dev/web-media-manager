export interface AlphabetScrubberProps {
  availableLetters: ReadonlySet<string>;
  onSelect: (letter: string) => void;
  side?: "left" | "right";
  className?: string;
  autoHide?: boolean;
  scrollRef?: React.RefObject<HTMLElement | null>;
}
