import type { Song } from "@/models";
import { cn } from "cn";

export function ExplicitBadge({
  song,
  className,
}: {
  song?: Pick<Song, "advisory"> | null;
  className?: string;
}) {
  if (song?.advisory !== "explicit") return null;

  return (
    <span
      role="img"
      aria-label="Explicit"
      title="Explicit"
      className={cn(
        "inline-flex size-3.5 shrink-0 items-center justify-center rounded-[3px] bg-muted-foreground/30 text-[9px] leading-none font-bold text-muted-foreground",
        className
      )}
    >
      E
    </span>
  );
}
