import { useEffect, useMemo, useState } from "react";
import { Filter, Lock, Pen, X } from "lucide-react";
import { getStore } from "@/core/system";
import { getSourcesStore } from "@/core/ports";
import { useSync } from "@/hooks";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { MusicSource } from "@/models";
import { useTranslation } from "@/i18n";

export type SourceFilterProps = {
  /** Ids of the sources currently filtering the page; empty means "all". */
  selected: string[];
  onSelectedChange: (ids: string[]) => void;
  /**
   * Element the popup is positioned against — the search field, so the popup
   * opens centred on it rather than on this button. Typing in that element
   * also keeps the popup open.
   */
  anchor?: HTMLElement | null;
};

/**
 * A source is editable when its library can be changed from this app: local
 * folders can, while a Subsonic server and a sync device are read-only here
 * (a device is written by syncing, not by editing its tracks).
 */
function isEditable(source: MusicSource): boolean {
  return source.capabilities.playlistWrite;
}

/**
 * Filter button that opens a popover of source chips. Sits beside the search
 * field so the chips cost no vertical space until they are asked for.
 * Renders nothing until a source exists.
 */
export function SourceFilter({
  selected,
  onSelectedChange,
  anchor,
}: SourceFilterProps) {
  const [sources, setSources] = useState<MusicSource[]>([]);
  const [open, setOpen] = useState(false);
  const { devices } = useSync();
  const { t } = useTranslation();

  // A sync device is only a filterable source while it is connected: its
  // tracks are read from the device, so an absent one would filter to nothing.
  const visibleSources = useMemo(() => {
    const connected = new Set(devices.map((device) => device.id));
    return sources.filter(
      (source) => source.kind !== "sync" || connected.has(source.id)
    );
  }, [sources, devices]);

  useEffect(() => {
    let cancelled = false;
    getStore()
      .getSources()
      .then((next) => {
        if (!cancelled) setSources(next);
      });

    const offAdded = getStore().onSourceAdded((source) =>
      setSources((prev) =>
        prev.some((s) => s.id === source.id) ? prev : [...prev, source]
      )
    );

    const sourcesStore = (() => {
      try {
        return getSourcesStore();
      } catch {
        // No source repository registered for this binding; the initial list
        // still renders, it just won't react to deletions.
        return null;
      }
    })();
    const offDeleted =
      sourcesStore?.onSourceDeleted((source) =>
        setSources((prev) => prev.filter((s) => s.id !== source.id))
      ) ?? (() => {});
    const offCleared =
      sourcesStore?.onSourcesCleared(() => setSources([])) ?? (() => {});

    return () => {
      cancelled = true;
      offAdded();
      offDeleted();
      offCleared();
    };
  }, []);

  if (visibleSources.length === 0) return null;

  // Filtering by source is meaningless with a single source, so it renders as
  // a static chip.
  const singleSource = visibleSources.length <= 1;

  function toggle(id: string) {
    onSelectedChange(
      selected.includes(id)
        ? selected.filter((s) => s !== id)
        : [...selected, id]
    );
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next, details) => {
        // Clicking into (or typing in) the anchored search field is not a
        // dismissal — the popup stays open so the two can be used together.
        if (
          !next &&
          (details.reason === "outside-press" || details.reason === "focus-out")
        ) {
          const target = details.event?.target;
          if (target instanceof Node && anchor?.contains(target)) {
            details.cancel();
            return;
          }
        }
        setOpen(next);
      }}
    >
      <PopoverTrigger
        render={
          <Button
            variant={selected.length > 0 ? "default" : "ghost"}
            size="icon-sm"
            className="shrink-0"
            title={t("source.filter")}
            aria-label={t("source.filter")}
            aria-pressed={selected.length > 0}
          >
            <Filter />
          </Button>
        }
      />

      {/* Centred on the search field, and the same width (max-w-xs = 20rem). */}
      <PopoverContent
        anchor={anchor}
        align="center"
        className="w-80 select-none"
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">{t("library.sources")}</div>
            {selected.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSelectedChange([])}
              >
                <X />
                {t("common.clear")}
              </Button>
            )}
          </div>

          <div className="flex flex-col gap-1">
            {visibleSources.map((source) => {
              const editable = isEditable(source);
              return (
                <Toggle
                  key={source.id}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  pressed={selected.includes(source.id)}
                  // Only the single-source case is unfilterable: with one
                  // source there is nothing to filter between. Editability is
                  // shown, not enforced.
                  disabled={singleSource}
                  onPressedChange={() => toggle(source.id)}
                  title={
                    editable
                      ? t("source.editableNamed", [source.name])
                      : t("source.readOnlyNamed", [source.name])
                  }
                >
                  <span className="min-w-0 truncate text-left">
                    {source.name}
                  </span>
                  {editable ? (
                    <Pen
                      className="shrink-0 opacity-60"
                      aria-hidden="true"
                    />
                  ) : (
                    <Lock
                      className="shrink-0 opacity-60"
                      aria-hidden="true"
                    />
                  )}
                  <span className="flex-1" />
                </Toggle>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
