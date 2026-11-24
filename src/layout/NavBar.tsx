import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TvNowPlayingIndicator } from "@/components/tv";
import { useTranslation } from "@/i18n";
import { APP_ICON_URL } from "@/lib/appIcon";
import { useIsTv } from "@/lib/hooks/useIsMobile";
import { CircleQuestionMark, Settings } from "lucide-react";
import { useNavigate } from "react-router";
import NotificationPopover from "./NotificationPopover";

export default function NavBar({ onOpenAbout }: { onOpenAbout: () => void }) {
  const isTv = useIsTv();
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="relative flex h-14 items-center justify-between px-4 border-b">
      <Tooltip>
        <TooltipTrigger
          render={
            <div className="flex size-9 items-center justify-center rounded-lg" />
          }
        >
          <img src={APP_ICON_URL} alt="" className="size-7 rounded-md" />
        </TooltipTrigger>
        <TooltipContent>{t("app.title")}</TooltipContent>
      </Tooltip>

      {/* Centered on the bar rather than in the flex flow, so it stays centred
          whatever the width of the controls on either side. */}
      {isTv && (
        <div className="pointer-events-none absolute inset-x-0 flex justify-center">
          <div className="pointer-events-auto">
            <TvNowPlayingIndicator />
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <NotificationPopover />
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("about.open")}
          onClick={onOpenAbout}
        >
          <CircleQuestionMark className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("settings.title")}
          onClick={() => void navigate("/settings")}
        >
          <Settings className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
