import { Disc3 } from "lucide-react";

import { cn } from "@/lib/shadcn-utils/utils";

/**
 * Placeholder for a release with no artwork: a disc in the accent colour on a
 * tint of it, rather than the white box a missing image would paint.
 */
export function NoArtworkDisc({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex h-full w-full items-center justify-center bg-accent/15 text-accent",
        className,
      )}
    >
      <Disc3 className="h-1/3 w-1/3" strokeWidth={1.5} />
    </div>
  );
}
