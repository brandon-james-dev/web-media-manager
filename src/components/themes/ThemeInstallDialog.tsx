import { useTranslation } from "@/i18n";
import { ThemeInstallChange } from "@/core/themes";
import type {
  InstalledTheme,
  PendingThemeInstall,
  ThemeReviewResult,
} from "@/core/themes";
import { useCommitTheme } from "@/hooks";
import { IssueSeverity } from "@/lib/themes/issues";
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
import { toast } from "@/components/ui/toast";
import { ThemeIssueList } from "./ThemeIssueList";

/**
 * Props for {@link ThemeInstallDialog}.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
 * ```
 * @example
 * ```tsx
 * <ThemeInstallDialog review={review} onOpenChange={setReview} />
 * ```
 */
export interface ThemeInstallDialogProps {
  review: ThemeReviewResult | null;
  onOpenChange(open: boolean): void;
  onInstalled?(theme: InstalledTheme): void;
}

function ChangeNotice({ pending }: { pending: PendingThemeInstall }) {
  const { t } = useTranslation();
  const installed = pending.existing?.version;

  if (pending.change === ThemeInstallChange.Update && installed !== undefined) {
    return (
      <p className="text-sm">
        {t("settings.themeChangeUpdate", [installed, pending.manifest.version])}
      </p>
    );
  }

  if (pending.change === ThemeInstallChange.Reinstall) {
    return (
      <p className="text-sm">
        {t("settings.themeChangeReinstall", [pending.manifest.version])}
      </p>
    );
  }

  if (
    pending.change === ThemeInstallChange.Downgrade &&
    installed !== undefined
  ) {
    return (
      <p className="text-sm text-amber-500">
        {t("settings.themeChangeDowngrade", [
          installed,
          pending.manifest.version,
        ])}
      </p>
    );
  }

  return null;
}

/**
 * Reviews a theme ZIP before it is stored: the manifest, how the package
 * relates to the installed version, and every warning the pipeline produced.
 * A package with errors shows the issues and no install action.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
 * ```
 * @example
 * ```tsx
 * <ThemeInstallDialog review={review} onOpenChange={setReview} />
 * ```
 */
export function ThemeInstallDialog({
  review,
  onOpenChange,
  onInstalled,
}: ThemeInstallDialogProps) {
  const { t } = useTranslation();
  const commit = useCommitTheme();
  const pending = review?.pending;
  const warnings =
    review?.issues.filter(
      (issue) => issue.severity === IssueSeverity.Warning
    ) ?? [];

  function handleCommit() {
    if (pending === undefined) return;

    commit.mutate(pending, {
      onSuccess: (theme) => {
        toast.add({
          type: "success",
          title: t("settings.themeInstalled", [theme.name]),
        });
        onInstalled?.(theme);
        onOpenChange(false);
      },
      onError: (error) => {
        toast.add({
          type: "error",
          title: t("settings.themeInstallFailed"),
          description: String(error),
        });
      },
    });
  }

  const actionLabel =
    pending?.change === ThemeInstallChange.Update
      ? t("settings.themeActionUpdate")
      : pending?.change === ThemeInstallChange.Reinstall
        ? t("settings.themeActionReinstall")
        : pending?.change === ThemeInstallChange.Downgrade
          ? t("settings.themeActionDowngrade")
          : t("settings.themeActionInstall");

  return (
    <Dialog open={review !== null} onOpenChange={onOpenChange}>
      <DialogContent className="select-none sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {pending === undefined
              ? t("settings.themeInstallFailed")
              : pending.manifest.name}
          </DialogTitle>
          {pending !== undefined && pending.manifest.author?.name && (
            <DialogDescription>
              {t("settings.themeByAuthor", [pending.manifest.author.name])}
            </DialogDescription>
          )}
        </DialogHeader>

        {pending === undefined ? (
          <ThemeIssueList issues={review?.issues ?? []} />
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {t("settings.themeVersion", [pending.manifest.version])}
                </Badge>
              </div>
              {pending.manifest.description && (
                <p className="text-sm text-muted-foreground">
                  {pending.manifest.description}
                </p>
              )}
            </div>

            <ChangeNotice pending={pending} />

            <ThemeIssueList issues={warnings} />
          </div>
        )}

        <DialogFooter>
          {pending === undefined ? (
            <DialogClose
              render={<Button variant="outline">{t("common.close")}</Button>}
            ></DialogClose>
          ) : (
            <>
              <DialogClose
                render={<Button variant="outline">{t("common.cancel")}</Button>}
              ></DialogClose>
              <Button
                variant={
                  pending.change === ThemeInstallChange.Downgrade
                    ? "destructive"
                    : "default"
                }
                disabled={commit.isPending}
                onClick={handleCommit}
              >
                {actionLabel}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
