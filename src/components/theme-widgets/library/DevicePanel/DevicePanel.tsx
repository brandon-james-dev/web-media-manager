import { cn } from "cn";
import { SyncDeviceCard } from "@/components/sync";
import { Button } from "@/components/ui/button";
import { attrBool } from "@/core/themes";
import { wmmBus } from "@/events";
import { useSync } from "@/hooks";
import { useTranslation } from "@/i18n";
import { THEME_ICONS } from "@/lib/themes/render/browser";
import type { ElementProps } from "@/lib/themes/render/browser";
import { useThemeTextClass } from "../../shared/themeText";
import { WidgetFrame } from "../../shared/WidgetFrame";

/**
 * The connected sync devices, each as a card with its contents and storage.
 * `allowAdd` offers the add-device action, and `titleText` styles the header.
 *
 * @example
 * ```xml
 * <DevicePanel grow="1" storage="true" allowAdd="true" titleText="@text/pane-header" />
 * <DevicePanel storage="true" allowAdd="true" titleText="@text/header" />
 * ```
 * @example
 * ```tsx
 * <RenderNode node={devicePanel} />
 * ```
 */
export function ThemeDevicePanel({ node, style }: ElementProps) {
  const { t } = useTranslation();
  const { devices, isSyncing } = useSync();
  const titleClass = useThemeTextClass(node, "titleText");
  const allowAdd = attrBool(node, "allowAdd") ?? false;
  const AddIcon = THEME_ICONS.add;

  return (
    <WidgetFrame node={node} style={style}>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex shrink-0 items-center justify-between gap-2">
          <span className={cn(titleClass, "truncate")}>
            {t("sync.devices")}
          </span>
          {allowAdd ? (
            <Button
              variant="ghost"
              size="icon-sm"
              className="shrink-0 cursor-default hover:bg-accent/20 focus-visible:ring-1 focus-visible:ring-ring"
              title={t("sync.addDevice")}
              aria-label={t("sync.addDevice")}
              disabled={isSyncing}
              onClick={() => wmmBus.invoke("wmm.sync.addDevice")}
            >
              <AddIcon aria-hidden />
            </Button>
          ) : null}
        </div>
        {devices.length === 0 ? (
          <span className="flex min-h-0 min-w-0 flex-1 items-center justify-center text-sm text-muted-foreground">
            {t("sync.noDevices")}
          </span>
        ) : (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-x-hidden overflow-y-auto">
            {devices.map((device) => (
              <SyncDeviceCard key={device.id} device={device} />
            ))}
          </div>
        )}
      </div>
    </WidgetFrame>
  );
}
