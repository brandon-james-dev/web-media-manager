import type { ReactNode } from "react";
import { cn } from "cn";

interface SyncStatProps {
  /** Caption under the value ("Tracks", "Queue Size"...). */
  label: string;
  /** The measured value; already formatted by the caller. */
  value: ReactNode;
  className?: string;
}

/**
 * One measurement in a sync surface's stat strip.
 *
 * The device card and the queue both summarise a few numbers, so they share
 * one tile rather than each inventing its own label/value markup.
 */
export function SyncStat({ label, value, className }: SyncStatProps) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-lg border px-2.5 py-1.5",
        className
      )}
    >
      <div className="truncate text-base leading-tight font-semibold tabular-nums">
        {value}
      </div>

      <div className="truncate text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
