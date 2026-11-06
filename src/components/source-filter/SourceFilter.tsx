import { useEffect, useState } from "react";
import { Filter, Pen, X } from "lucide-react";
import { getStore } from "@/core/system";
import { getSourcesStore } from "@/core/ports";
import { musicSourceStrategies } from "@/lib/sources";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { MusicSource } from "@/models";

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

/** A source kind is editable when its strategy can persist settings. */
function isEditable(source: MusicSource): boolean {
  return musicSourceStrategies.some(
    (strategy) => strategy.kind === source.kind && strategy.updateSource
  );
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

  if (sources.length === 0) return null;

  // Filtering by source is meaningless with a single source, and an editable
  // source is excluded from the filter — both render as a static chip.
  const singleSource = sources.length <= 1;

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
            title="Filter by source"
            aria-label="Filter by source"
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
            <div className="text-sm font-medium">Sources</div>
            {selected.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSelectedChange([])}
              >
                <X />
                Clear
              </Button>
            )}
          </div>

          <div className="flex flex-col gap-1">
            {sources.map((source) => {
              const editable = isEditable(source);
              return (
                <Toggle
                  key={source.id}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  pressed={selected.includes(source.id)}
                  disabled={singleSource || editable}
                  onPressedChange={() => toggle(source.id)}
                  title={
                    editable ? `${source.name} — editable source` : source.name
                  }
                >
                  <span className="min-w-0 flex-1 truncate text-left">
                    {source.name}
                  </span>
                  {editable && (
                    <Pen className="shrink-0 opacity-60" aria-hidden="true" />
                  )}
                </Toggle>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
