import { useEffect, useState } from "react";
import { cn } from "cn";

import { getLyricsSettingsStore } from "@/core/ports";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/i18n";
import type { LyricsSettingsProps } from "./LyricsSettingsProps";

/**
 * Settings for the online lyrics lookup.
 *
 * The application id is sent to providers that rate-limit per app; lookups
 * work without one. The dialog reads the stored value when it opens and saves
 * on demand, so a half-typed id never reaches a lookup.
 */
export function LyricsSettings({
  open,
  onOpenChange,
  className,
}: LyricsSettingsProps) {
  const { t } = useTranslation();
  const [applicationId, setApplicationId] = useState("");
  const [savedApplicationId, setSavedApplicationId] = useState("");

  useEffect(() => {
    if (!open) return;

    void getLyricsSettingsStore()
      .getSettings()
      .then(({ applicationId: stored }) => {
        setApplicationId(stored ?? "");
        setSavedApplicationId(stored ?? "");
      });
  }, [open]);

  async function handleSave() {
    await getLyricsSettingsStore().setApplicationId(applicationId);
    setSavedApplicationId(applicationId.trim());
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("sm:max-w-md", className)}>
        <DialogHeader>
          <DialogTitle>{t("settings.lyricsSettings")}</DialogTitle>
          <DialogDescription>
            {t("settings.lyricsSettingsDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="space-y-1">
            <Label htmlFor="lyrics-application-id">
              {t("settings.lyricsApplicationId")}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t("settings.lyricsApplicationIdDescription")}
            </p>
          </div>

          <Input
            id="lyrics-application-id"
            value={applicationId}
            autoComplete="off"
            placeholder={t("settings.lyricsApplicationIdPlaceholder")}
            onChange={(e) => setApplicationId(e.target.value)}
          />

          <Button
            onClick={() => void handleSave()}
            className="w-full"
            disabled={applicationId.trim() === savedApplicationId}
          >
            {t("settings.save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
