import { Check, ImageOff, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "cn";

import {
  VISUALIZER_RUNTIMES,
  getRuntimeDescriptor,
  type VisualizerRuntime,
} from "@/core/visualizers";
import {
  useInstalledPlugins,
  usePluginThumbnail,
  useVisualizer,
} from "@/hooks";
import { Badge } from "@/components/ui/badge";
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
 * makes one active. Search matches name, author, description and id; the
 * runtime filter narrows by execution model.
 */
export function VisualizerSelector({
  className,
  variant = "list",
  onSelect,
}: VisualizerSelectorProps) {
  const { data: plugins, isPending } = useInstalledPlugins();
  const { activePluginId, setActivePluginId } = useVisualizer();
  const [query, setQuery] = useState("");
  const [runtime, setRuntime] = useState<VisualizerRuntime | "all">("all");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return (plugins ?? []).filter((plugin) => {
      if (runtime !== "all" && plugin.runtime !== runtime) {
        return false;
      }
      if (!needle) {
        return true;
      }

      return [plugin.name, plugin.id, plugin.author, plugin.description]
        .filter((value): value is string => typeof value === "string")
        .some((value) => value.toLowerCase().includes(needle));
    });
  }, [plugins, query, runtime]);

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
      <div className="flex shrink-0 items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search visualizers"
            aria-label="Search visualizers"
            className="pl-7"
          />
        </div>
        <Select
          value={runtime}
          items={[
            { value: "all", label: "All runtimes" },
            ...VISUALIZER_RUNTIMES.map((descriptor) => ({
              value: descriptor.id,
              label: descriptor.label,
            })),
          ]}
          onValueChange={(value) => {
            if (typeof value === "string") {
              setRuntime(value as VisualizerRuntime | "all");
            }
          }}
        >
          <SelectTrigger className="w-36 shrink-0" aria-label="Runtime">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All runtimes</SelectItem>
            {VISUALIZER_RUNTIMES.map((descriptor) => (
              <SelectItem key={descriptor.id} value={descriptor.id}>
                {descriptor.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
          <ul className="flex flex-col gap-1 pr-2">
            {filtered.map((plugin) => {
              const isActive = plugin.id === activePluginId;

              return (
                <li key={plugin.id}>
                  <button
                    type="button"
                    onClick={() => select(plugin.id)}
                    aria-pressed={isActive}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border border-transparent p-2 text-left transition-colors hover:bg-muted",
                      isActive && "border-border bg-muted"
                    )}
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
                    {isActive && (
                      <Check className="size-4 shrink-0 text-primary" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>
    </div>
  );
}
