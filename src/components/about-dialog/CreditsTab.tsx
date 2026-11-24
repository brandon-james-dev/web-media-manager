import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "@/i18n";
import { OSS_CREDITS } from "./ossCredits";

export function CreditsTab() {
  const { t } = useTranslation();

  return (
    <ScrollArea className="max-h-[60vh] pr-4">
      <div className="mt-4 flex flex-col gap-2">
        <p className="text-xs text-muted-foreground">
          {t("about.creditsDescription")}
        </p>
        <ul className="flex flex-col gap-1.5">
          {OSS_CREDITS.map((credit) => (
            <li
              key={credit.name}
              className="flex items-center justify-between gap-3 border-b pb-1.5 text-xs last:border-b-0"
            >
              <a
                href={credit.url}
                target="_blank"
                rel="noreferrer"
                className="truncate underline-offset-3 hover:underline"
              >
                {credit.name}
              </a>
              <Badge variant="ghost" className="shrink-0">
                {credit.license}
              </Badge>
            </li>
          ))}
        </ul>
      </div>
    </ScrollArea>
  );
}
