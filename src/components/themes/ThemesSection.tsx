import { Check, PackagePlus, RotateCcw, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "cn";

import { derivePalette } from "@/core/themes";
import type { InstalledTheme, ThemeReviewResult } from "@/core/themes";
import {
  useActiveThemeId,
  useApplyTheme,
  useInstalledThemes,
  useRemoveTheme,
  useResetTheme,
  useReviewTheme,
  useThemeThumbnail,
} from "@/hooks";
import { useTranslation } from "@/i18n";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/components/ui/toast";
import { ThemeInstallDialog } from "./ThemeInstallDialog";

const SCHEME_LABEL_KEYS = {
  light: "settings.themeLight",
  dark: "settings.themeDark",
} as const;

/** Preview box for the built-in theme, drawn from the host CSS variables. */
function ThemeSwatch() {
  return (
    <span className="flex size-12 shrink-0 flex-col justify-center gap-1 rounded-md border bg-background p-1.5">
      <span className="h-1.5 w-full rounded-full bg-foreground/80" />
      <span className="size-2 rounded-full bg-primary" />
    </span>
  );
}

/** Package thumbnail, or a palette swatch when the manifest has none. */
function ThemeThumbnail({ theme }: { theme: InstalledTheme }) {
  const url = useThemeThumbnail(theme);

  if (url) {
    return (
      <img
        src={url}
        alt=""
        draggable={false}
        className="size-12 shrink-0 rounded-md object-cover"
      />
    );
  }

  const scheme = theme.ir.colorSchemes[0];
  const palette = derivePalette(
    (scheme === undefined ? undefined : theme.ir.palettes[scheme]) ?? {}
  );

  return (
    <span
      className="flex size-12 shrink-0 flex-col justify-center gap-1 rounded-md border p-1.5"
      style={{
        backgroundColor: palette.background,
        borderColor: palette.border,
      }}
    >
      <span
        className="h-1.5 w-full rounded-full"
        style={{ backgroundColor: palette.foreground }}
      />
      <span
        className="size-2 rounded-full"
        style={{ backgroundColor: palette.accent }}
      />
    </span>
  );
}

/**
 * The settings theme picker: the built-in theme, every installed package, and
 * the actions that install, remove and reset them. A pick applies at once and
 * starts the host trial bar, so an unreadable theme reverts on its own.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
 * ```
 * @example
 * ```tsx
 * <ThemesSection />
 * ```
 */
export function ThemesSection() {
  const { t } = useTranslation();
  const { data: themes } = useInstalledThemes();
  const { data: activeThemeId } = useActiveThemeId();
  const applyTheme = useApplyTheme();
  const value = activeThemeId ?? undefined;
  const review = useReviewTheme();
  const remove = useRemoveTheme();
  const reset = useResetTheme();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [reviewResult, setReviewResult] = useState<ThemeReviewResult | null>(
    null
  );
  const [confirmRemove, setConfirmRemove] = useState<InstalledTheme | null>(
    null
  );

  async function handleFile(file: File | undefined) {
    if (file === undefined) return;

    try {
      setReviewResult(await review.mutateAsync(file));
    } catch (error) {
      toast.add({
        type: "error",
        title: t("settings.themeInstallFailed"),
        description: String(error),
      });
    }
  }

  async function onChange(id: string | undefined) {
    try {
      await applyTheme(id);
    } catch (error) {
      toast.add({
        type: "error",
        title: t("settings.themeApplyFailed"),
        description: String(error),
      });
    }
  }

  function handleRemove() {
    if (confirmRemove === null) return;

    remove.mutate(confirmRemove.id, {
      onSuccess: () => setConfirmRemove(null),
    });
  }

  function handleReset() {
    reset.mutate(undefined, {
      onSuccess: () => {
        toast.add({
          type: "success",
          title: t("settings.themeResetDone"),
        });
      },
    });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>{t("settings.themes")}</Label>
        <p className="text-sm text-muted-foreground">
          {t("settings.themesDescription")}
        </p>
      </div>

      <ScrollArea className="max-h-80">
        <ul className="flex flex-col gap-1">
          <li>
            <div
              className={cn(
                "flex w-full items-center gap-1 rounded-lg border border-transparent p-2 transition-colors hover:bg-muted",
                value === undefined && "border-border bg-muted"
              )}
            >
              <button
                type="button"
                onClick={() => void onChange(undefined)}
                aria-pressed={value === undefined}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <ThemeSwatch />
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-medium">
                      {t("settings.themeBuiltIn")}
                    </span>
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {t("settings.themeBuiltInDescription")}
                  </span>
                </span>
              </button>

              {value === undefined && (
                <Check className="size-4 shrink-0 text-primary" />
              )}
            </div>
          </li>

          {(themes ?? []).map((theme) => {
            const isActive = value === theme.id;

            return (
              <li key={theme.id}>
                <div
                  className={cn(
                    "flex w-full items-center gap-1 rounded-lg border border-transparent p-2 transition-colors hover:bg-muted",
                    isActive && "border-border bg-muted"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => void onChange(theme.id)}
                    aria-pressed={isActive}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <ThemeThumbnail theme={theme} />
                    <span className="min-w-0 flex-1">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate font-medium">
                          {theme.name}
                        </span>
                        <Badge variant="outline">{theme.version}</Badge>
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {theme.manifest.author?.name ??
                          t("visualizer.unknownAuthor")}
                        {" · "}
                        {theme.ir.colorSchemes
                          .map((scheme) => t(SCHEME_LABEL_KEYS[scheme]))
                          .join(", ")}
                      </span>
                    </span>
                  </button>

                  {isActive && (
                    <Check className="size-4 shrink-0 text-primary" />
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    title={t("settings.themeRemoveNamed", [theme.name])}
                    aria-label={t("settings.themeRemoveNamed", [theme.name])}
                    onClick={() => setConfirmRemove(theme)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </ScrollArea>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          disabled={review.isPending}
          onClick={() => fileInputRef.current?.click()}
        >
          <PackagePlus />
          {t("settings.themeInstall")}
        </Button>
        <Button
          variant="outline"
          disabled={reset.isPending}
          onClick={handleReset}
        >
          <RotateCcw />
          {t("settings.themeReset")}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            void handleFile(file);
          }}
        />
      </div>

      <ThemeInstallDialog
        review={reviewResult}
        onOpenChange={(open) => {
          if (!open) setReviewResult(null);
        }}
      />

      <Dialog
        open={confirmRemove !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmRemove(null);
        }}
      >
        <DialogContent className="select-none w-lg">
          <DialogHeader>
            <DialogTitle>{t("settings.themeRemoveTitle")}</DialogTitle>
            <DialogDescription>
              {t("settings.themeRemoveDescription", [
                confirmRemove?.name ?? "",
              ])}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <DialogClose
              render={<Button variant="outline">{t("common.cancel")}</Button>}
            ></DialogClose>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={handleRemove}
            >
              {t("common.remove")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
