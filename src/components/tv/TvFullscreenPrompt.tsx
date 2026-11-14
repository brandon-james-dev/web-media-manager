import { useEffect, useState } from "react";
import { Maximize2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useIsTv } from "@/lib/hooks/useIsMobile";
import { isHostedShell } from "@/lib/tv/detectTv";

const DISMISSED_KEY = "wmm.tv-fullscreen-dismissed";

function wasDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Fullscreen prompt for televisions.
 *
 * A TV browser opens the app in a window with its own chrome, which costs
 * vertical space and leaves the remote's Back key navigating browser history.
 * Fullscreen has to be entered from a user gesture, so the app cannot do it on
 * its own — this dialog supplies the gesture with one large, focusable button
 * that the remote's Select key activates.
 *
 * It appears once per device: dismissing it is remembered, and it never shows
 * again once the document is fullscreen. It is also suppressed inside a native
 * shell (Amazon's Web App Tester, Cordova), which already fills the screen.
 */
export function TvFullscreenPrompt() {
  const isTv = useIsTv();
  const [dismissed, setDismissed] = useState(wasDismissed);
  const [isFullscreen, setIsFullscreen] = useState(
    () => typeof document !== "undefined" && !!document.fullscreenElement
  );

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const open = isTv && !isHostedShell() && !dismissed && !isFullscreen;

  function dismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Storage can be unavailable; the prompt stays dismissed for this load.
    }
  }

  async function enterFullscreen() {
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      // A browser that refuses the request leaves the dialog up so the user
      // can try again or dismiss it.
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) dismiss();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="max-w-lg gap-6 p-8 text-center"
      >
        <DialogHeader className="items-center gap-3">
          <DialogTitle className="text-2xl">Use the whole screen</DialogTitle>
          <DialogDescription className="text-base">
            Fullscreen hides the browser bars and gives the visualizer the
            whole television.
          </DialogDescription>
        </DialogHeader>

        <Button
          size="lg"
          autoFocus
          onClick={() => void enterFullscreen()}
          className="h-24 w-full gap-4 text-2xl font-semibold"
        >
          <Maximize2 className="size-10" />
          Go fullscreen
        </Button>

        <Button variant="ghost" size="lg" onClick={dismiss} className="h-14">
          Not now
        </Button>
      </DialogContent>
    </Dialog>
  );
}
