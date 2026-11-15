import { Check } from "lucide-react";
import { useOfflineDownload } from "@/hooks";
import { cn } from "cn";

const SIZE = 40;
const STROKE = 3;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Progress for an album's offline downloads, drawn over its card.
 *
 * A ring fills as its songs cache and reads "3 / 12" underneath; once the
 * batch finishes the ring is replaced by a tick for a few seconds. Renders
 * nothing when no batch is running, so a card is unchanged otherwise.
 */
export function AlbumOfflineRing({
  batchId,
  className,
}: {
  batchId: string;
  className?: string;
}) {
  const batch = useOfflineDownload(batchId);

  if (!batch) return null;

  const done = batch.state === "completed";
  const ratio = batch.total === 0 ? 1 : batch.completed / batch.total;
  const percent = Math.round(ratio * 100);

  return (
    <div
      className={cn(
        "pointer-events-none absolute right-1.5 top-1.5 flex flex-col items-center gap-0.5",
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={
        done
          ? `Album available offline, ${batch.total} songs cached`
          : `Caching ${batch.completed} of ${batch.total} songs`
      }
    >
      <div
        className="relative grid place-items-center rounded-full bg-background/85 shadow-sm backdrop-blur-sm"
        style={{ width: SIZE, height: SIZE }}
      >
        {done ? (
          <Check size={18} className="text-accent" strokeWidth={3} />
        ) : (
          <>
            <svg
              width={SIZE}
              height={SIZE}
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              className="-rotate-90"
              aria-hidden="true"
            >
              <circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                strokeWidth={STROKE}
                className="stroke-muted"
              />
              <circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={CIRCUMFERENCE * (1 - ratio)}
                className="stroke-primary transition-[stroke-dashoffset] duration-300"
              />
            </svg>
            <span className="absolute text-[10px] font-medium tabular-nums">
              {percent}%
            </span>
          </>
        )}
      </div>

      <span className="rounded bg-background/85 px-1 text-[10px] tabular-nums text-muted-foreground backdrop-blur-sm">
        {batch.completed} / {batch.total}
      </span>
    </div>
  );
}
