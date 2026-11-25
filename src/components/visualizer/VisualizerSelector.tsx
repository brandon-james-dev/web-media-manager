import { Check, ImageOff, SlidersHorizontal } from "lucide-react";
import { cn } from "cn";

import { getRuntimeDescriptor } from "@/core/visualizers";
import {
  useInstalledPlugins,
  usePluginThumbnail,
  useVisualizer,
} from "@/hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "@/i18n";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { VisualizerSelectorProps } from "./VisualizerSelectorProps";

function PluginThumbnail({
  pluginId,
  className,
}: {
  pluginId: string;
  className?: string;
}) {
  const url = usePluginThumbnail(pluginId);

  if (!url) {
    return (
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-md border bg-muted",
          className
        )}
      >
        <ImageOff className="size-4 text-muted-foreground" />
      </span>
    );
  }

  return (
    <img
      src={url}
      alt=""
      draggable={false}
      className={cn("shrink-0 rounded-md object-cover", className)}
    />
  );
}

/**
 * Lists installed visualizers with a thumbnail, name, version and author, and
 * makes one active.
 */
export function VisualizerSelector({
  className,
  triggerClassName,
  variant = "list",
  onSelect,
  onConfigure,
}: VisualizerSelectorProps) {
  const { t } = useTranslation();
  const { data: plugins, isPending } = useInstalledPlugins();
  const { activePluginId, setActivePluginId } = useVisualizer();

  function select(pluginId: string) {
    setActivePluginId(pluginId);
    onSelect?.(pluginId);
  }

  if (variant === "compact") {
    return (
      <Select
        value={activePluginId ?? undefined}
        items={(plugins ?? []).map((plugin) => ({
          value: plugin.id,
          label: plugin.name,
        }))}
        onValueChange={(value) => {
          if (typeof value === "string") {
            select(value);
          }
        }}
      >
        <SelectTrigger
          className={cn("h-8 w-full min-w-0", className, triggerClassName)}
          aria-label={t("visualizer.title")}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(plugins ?? []).map((plugin) => (
            <SelectItem key={plugin.id} value={plugin.id}>
              {plugin.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <div className={cn("flex min-h-0 flex-col gap-2", className)}>
      <ScrollArea className="min-h-0 flex-1">
        {isPending ? (
          <p className="p-3 text-sm text-muted-foreground">
            {t("visualizer.loadingPlugins")}
          </p>
        ) : (plugins ?? []).length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">
            {t("visualizer.noneInstalled")}
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {(plugins ?? []).map((plugin) => {
              const isActive = plugin.id === activePluginId;
              const runtime = plugin.runtime
                ? getRuntimeDescriptor(plugin.runtime)
                : undefined;

              return (
                <li key={plugin.id}>
                  <div
                    className={cn(
                      "flex w-full items-center gap-1 rounded-lg border border-transparent p-2 transition-colors hover:bg-muted",
                      isActive && "border-border bg-muted"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => select(plugin.id)}
                      aria-pressed={isActive}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <PluginThumbnail
                        pluginId={plugin.id}
                        className="size-12"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate font-medium">
                            {plugin.name}
                          </span>
                          <Badge variant="outline">{plugin.version}</Badge>
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {plugin.author ?? t("visualizer.unknownAuthor")}
                          {" · "}
                          {runtime ? t(runtime.labelKey) : plugin.runtime}
                        </span>
                      </span>
                    </button>

                    {isActive && (
                      <Check className="size-4 shrink-0 text-primary" />
                    )}

                    {onConfigure && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        title={t("visualizer.configureNamed", [plugin.name])}
                        aria-label={t("visualizer.configureNamed", [
                          plugin.name,
                        ])}
                        onClick={() => onConfigure(plugin.id)}
                      >
                        <SlidersHorizontal className="size-4" />
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>
    </div>
  );
}
