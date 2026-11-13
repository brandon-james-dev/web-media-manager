import { RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "cn";

import type {
  PluginSettingDescriptor,
  PluginSettingValue,
  PluginSettingsValues,
} from "@/core/visualizers";
import {
  useInstalledPlugins,
  usePluginSettings,
  useResetPluginSettings,
  useSavePluginSettings,
  useVisualizer,
  visualizerKeys,
} from "@/hooks";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type { VisualizerSettingsProps } from "./VisualizerSettingsProps";

function formatNumber(value: number, step: number): string {
  const decimals = Math.min(3, Math.max(0, Math.ceil(-Math.log10(step))));
  return value.toFixed(decimals);
}

function SettingControl({
  descriptor,
  value,
  onChange,
}: {
  descriptor: PluginSettingDescriptor;
  value: PluginSettingValue | undefined;
  onChange: (value: PluginSettingValue) => void;
}) {
  switch (descriptor.type) {
    case "number": {
      const current =
        typeof value === "number" ? value : descriptor.default;
      const min = descriptor.min ?? 0;
      const max = descriptor.max ?? 100;
      const step = descriptor.step ?? 0.01;

      return (
        <Slider
          className="w-full"
          value={[current]}
          min={min}
          max={max}
          step={step}
          onValueChange={(next) => {
            const raw = Array.isArray(next) ? next[0] : next;
            if (typeof raw === "number") {
              onChange(raw);
            }
          }}
        />
      );
    }
    case "boolean":
      return (
        <Switch
          checked={typeof value === "boolean" ? value : descriptor.default}
          onCheckedChange={onChange}
        />
      );
    case "select":
      return (
        <Select
          value={typeof value === "string" ? value : descriptor.default}
          items={descriptor.options.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
          onValueChange={(next) => {
            if (typeof next === "string") {
              onChange(next);
            }
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {descriptor.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case "color":
      return (
        <Input
          type="color"
          className="h-8 w-16 p-1"
          value={typeof value === "string" ? value : descriptor.default}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    case "string":
      return (
        <Input
          value={typeof value === "string" ? value : descriptor.default}
          maxLength={descriptor.maxLength}
          onChange={(event) => onChange(event.target.value)}
        />
      );
  }
}

/**
 * Schema-driven settings for the active plugin.
 *
 * The manifest declares each setting's type, range and default; this dialog
 * renders the matching control and persists values through the manager, so
 * plugins never touch storage themselves. Reset deletes the stored row and
 * restores the manifest defaults.
 */
export function VisualizerSettings({
  pluginId,
  className,
}: VisualizerSettingsProps) {
  const {
    settingsOpen,
    setSettingsOpen,
    activePluginId,
  } = useVisualizer();
  const resolvedId = pluginId ?? activePluginId;
  const { data: plugins } = useInstalledPlugins();
  const { data: settings } = usePluginSettings(resolvedId);
  const save = useSavePluginSettings(resolvedId);
  const reset = useResetPluginSettings(resolvedId);
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<PluginSettingsValues>({});
  const draftFor = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<PluginSettingsValues | null>(null);
  const saveRef = useRef(save.mutate);
  saveRef.current = save.mutate;

  // Adopt the stored values when the dialog switches plugin. Echoes of our own
  // saves must not overwrite the draft, or a slider snaps back to an older
  // value mid-drag.
  useEffect(() => {
    if (!settings || draftFor.current === resolvedId) {
      return;
    }
    draftFor.current = resolvedId;
    setDraft(settings);
  }, [settings, resolvedId]);

  // Persist the last value once the drag settles, and flush on close.
  useEffect(
    () => () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }
      const values = pending.current;
      if (values) {
        saveRef.current(values);
      }
    },
    []
  );

  const plugin = plugins?.find((entry) => entry.id === resolvedId);
  const descriptors = plugin?.manifest.settings ?? [];

  function update(key: string, value: PluginSettingValue) {
    const next = { ...draft, [key]: value };
    setDraft(next);
    pending.current = next;
    // The visualizer reads settings from this cache entry, so publish the
    // change now and let the write to storage catch up.
    queryClient.setQueryData(
      visualizerKeys.settings(resolvedId ?? "none"),
      next
    );
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
    }
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      const values = pending.current;
      pending.current = null;
      if (values) {
        saveRef.current(values);
      }
    }, 120);
  }

  return (
    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
      <DialogContent
        className={cn("z-120 sm:max-w-md", className)}
        overlayClassName="z-120"
      >
        <DialogHeader>
          <DialogTitle>
            {plugin ? `${plugin.name} settings` : "Visualizer settings"}
          </DialogTitle>
          <DialogDescription>
            Settings are stored with the plugin and restored on the next launch.
          </DialogDescription>
        </DialogHeader>

        {!plugin ? (
          <p className="text-sm text-muted-foreground">
            Select a visualizer to configure it.
          </p>
        ) : descriptors.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            This visualizer has no settings.
          </p>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <div className="flex flex-col gap-4 pr-2">
              {descriptors.map((descriptor) => (
                <div key={descriptor.key} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor={`setting-${descriptor.key}`}>
                      {descriptor.label}
                    </Label>
                    {descriptor.type === "number" && (
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {formatNumber(
                          typeof draft[descriptor.key] === "number"
                            ? (draft[descriptor.key] as number)
                            : descriptor.default,
                          descriptor.step ?? 0.01
                        )}
                      </span>
                    )}
                  </div>
                  <SettingControl
                    descriptor={descriptor}
                    value={draft[descriptor.key]}
                    onChange={(value) => update(descriptor.key, value)}
                  />
                  {descriptor.description && (
                    <p className="text-xs text-muted-foreground">
                      {descriptor.description}
                    </p>
                  )}
                </div>
              ))}

              <Button
                size="sm"
                variant="outline"
                className="self-start"
                disabled={reset.isPending}
                onClick={() => {
                  if (saveTimer.current) {
                    clearTimeout(saveTimer.current);
                    saveTimer.current = null;
                  }
                  pending.current = null;
                  reset.mutate(undefined, {
                    onSuccess: (values) => setDraft(values),
                  });
                }}
              >
                <RotateCcw />
                Reset to defaults
              </Button>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
