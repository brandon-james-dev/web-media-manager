import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { themeTrial } from "@/core/themes/themeTrial";
import { useTranslation } from "@/i18n";

/**
 * Host-owned "Keep this theme?" bar shown while a newly applied theme is on
 * trial. It is never laid out by a theme, so a broken theme can always be
 * reverted from it.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
 * ```
 * @example
 * ```tsx
 * <ThemeTrialBar />
 * ```
 */
export function ThemeTrialBar() {
  const { t } = useTranslation();
  const trial = useSyncExternalStore(
    themeTrial.subscribe,
    themeTrial.getSnapshot,
    themeTrial.getSnapshot
  );
  if (trial === undefined) return null;
  return (
    <div
      role="alertdialog"
      aria-live="polite"
      className="fixed inset-x-0 bottom-4 z-100 mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-3 rounded-lg border bg-popover px-4 py-2 text-popover-foreground shadow-lg"
    >
      <span className="text-sm">
        {t("settings.themeTrialPrompt", [String(trial.secondsLeft)])}
      </span>
      <Button size="sm" onClick={() => themeTrial.keep()}>
        {t("settings.themeTrialKeep")}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => void themeTrial.revert()}
      >
        {t("settings.themeTrialRevert")}
      </Button>
    </div>
  );
}
