import type { Song } from "@/models";
import { useTranslation } from "@/i18n";
import { cn } from "cn";

export function ExplicitBadge({
  song,
  className,
}: {
  song?: Pick<Song, "advisory"> | null;
  className?: string;
}) {
  const { t } = useTranslation();

  if (song?.advisory !== "explicit") return null;

  return (
    <span
      role="img"
      aria-label={t("metadata.explicit")}
      title={t("metadata.explicit")}
      className={cn(
        "inline-flex size-3.5 shrink-0 items-center justify-center rounded-[3px] bg-muted-foreground/30 text-[9px] leading-none font-bold text-muted-foreground",
        className
      )}
    >
      E
    </span>
  );
}
