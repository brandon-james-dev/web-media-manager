import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { system } from "@/core";
import { useTranslation } from "@/i18n";
import { APP_ICON_URL } from "@/lib/appIcon";
import { ExternalLink, Heart } from "lucide-react";
import type { ReactNode } from "react";

const REPOSITORY_URL = "https://github.com/brandon-james-dev/web-media-manager";
const LIVE_DEMO_URL = "https://brandon-james-dev.github.io/web-media-manager/";
const SUPPORT_URL = "https://brandonjames70.gumroad.com/l/wmm";
const SPONSOR_URL = "https://github.com/sponsors/brandon-james-dev";

function formatBuildTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function ExternalLinkButton({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: ReactNode;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      nativeButton={false}
      render={<a href={href} target="_blank" rel="noreferrer" />}
    >
      {icon}
      {label}
      <ExternalLink data-icon="inline-end" className="opacity-60" />
    </Button>
  );
}

export function AboutTab() {
  const { t } = useTranslation();

  return (
    <ScrollArea className="max-h-[60vh] pr-4">
      <div className="mt-4 flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <img
            src={APP_ICON_URL}
            alt=""
            className="size-12 shrink-0 rounded-xl"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium">{t("app.title")}</span>
              <Badge variant="outline">{system.WMM_VERSION}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("about.description")}
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
          <dt className="text-muted-foreground">{t("about.version")}</dt>
          <dd>{system.WMM_VERSION}</dd>
          <dt className="text-muted-foreground">{t("about.built")}</dt>
          <dd>{formatBuildTime(system.WMM_BUILD_TIME)}</dd>
          <dt className="text-muted-foreground">{t("about.commit")}</dt>
          <dd className="font-mono">{system.WMM_COMMIT_HASH}</dd>
        </dl>

        <Separator />

        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-medium text-muted-foreground">
            {t("about.links")}
          </h3>
          <div className="flex flex-wrap gap-2">
            <ExternalLinkButton
              href={REPOSITORY_URL}
              label={t("about.repository")}
              icon={null}
            />
            <ExternalLinkButton
              href={LIVE_DEMO_URL}
              label={t("about.liveDemo")}
              icon={null}
            />
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-medium text-muted-foreground">
            {t("about.support")}
          </h3>
          <div className="flex flex-wrap gap-2">
            <ExternalLinkButton
              href={SUPPORT_URL}
              label={t("about.gumroad")}
              icon={<Heart />}
            />
            <ExternalLinkButton
              href={SPONSOR_URL}
              label={t("about.sponsor")}
              icon={<Heart />}
            />
          </div>
        </section>
      </div>
    </ScrollArea>
  );
}
