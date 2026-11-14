import { Button } from "@/components/ui/button";
import { TvNowPlayingIndicator } from "@/components/tv";
import { useIsTv } from "@/lib/hooks/useIsMobile";
import { Settings } from "lucide-react";
import { NavLink } from "react-router";
import NotificationPopover from "./NotificationPopover";

export default function NavBar() {
  const isTv = useIsTv();

  return (
    <div className="relative flex h-14 items-center justify-between px-4 border-b">
      <div className="font-semibold select-none">Web Media Manager</div>

      {/* Centred on the bar rather than in the flex flow, so it stays centred
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
        <NavLink to={"/settings"}>
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>
        </NavLink>
      </div>
    </div>
  );
}
