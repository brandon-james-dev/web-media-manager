import { Check, ImageOff, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "cn";

import { getRuntimeDescriptor } from "@/core/visualizers";
import {
  useInstalledPlugins,
  usePluginThumbnail,
  useVisualizer,
} from "@/hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
 * makes one active. Search matches name, author, description and id.
 */
export function VisualizerSelector({
  className,
  variant = "list",
  onSelect,
  onConfigure,
}: VisualizerSelectorProps) {
  const { data: plugins, isPending } = useInstalledPlugins();
  const { activePluginId, setActivePluginId } = useVisualizer();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return (plugins ?? []).filter((plugin) => {
      if (!needle) {
        return true;
      }

      return [plugin.name, plugin.id, plugin.author, plugin.description]
        .filter((value): value is string => typeof value === "string")
        .some((value) => value.toLowerCase().includes(needle));
    });
  }, [plugins, query]);

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
          className={cn("h-8 w-full min-w-0", className)}
          aria-label="Visualizer"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent positionerClassName="z-120">
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
      <div className="relative shrink-0">
        <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search visualizers"
          aria-label="Search visualizers"
          className="pl-7"
        />
      </div>

      <ScrollArea className="min-h-0 flex-1">
        {isPending ? (
          <p className="p-3 text-sm text-muted-foreground">
            Loading plugins…
          </p>
        ) : filtered.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">
            {plugins?.length
              ? "No visualizers match this search."
              : "No visualizers installed yet."}
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {filtered.map((plugin) => {
              const isActive = plugin.id === activePluginId;

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
                          {plugin.author ?? "Unknown author"}
                          {" · "}
                          {getRuntimeDescriptor(plugin.runtime)?.label ??
                            plugin.runtime}
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
                        title={`Configure ${plugin.name}`}
                        aria-label={`Configure ${plugin.name}`}
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
