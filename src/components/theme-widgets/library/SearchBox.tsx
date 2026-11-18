import { useMemo, useState } from "react";
import { cn } from "cn";
import { SourceFilter } from "@/components/source-filter";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useSidebarPlaylists } from "@/components/library-sidebar/useSidebarPlaylists";
import { useSongs, useSync } from "@/hooks";
import { useTranslation } from "@/i18n";
import type { WmmResourceKey } from "@/i18n";
import {
  attrBool,
  attrRef,
  attrString,
  THEME_ICONS,
} from "@/lib/themes/render";
import { useThemeRender } from "@/lib/themes/render/browser";
import type { ElementProps } from "@/lib/themes/render/browser";
import { WidgetFrame } from "../shared/WidgetFrame";
import { filterLibrarySongs } from "./filterSongs";
import { useLibrarySelection } from "./librarySelection";

/**
 * The search field of a page. It writes the page's library query, or its sync
 * query when `scope="sync"`, and can carry the source filter and a result
 * count. `presentation="button"` puts the field behind a themed button.
 *
 * @example
 * ```xml
 * <SearchBox scope="library" sourceFilter="true" resultCount="true"
 *            placeholderKey="search.placeholder" />
 * <SearchBox presentation="button" display="iconAndLabel" style="@button/tab" />
 * ```
 * @example
 * ```tsx
 * <RenderNode node={searchBox} />
 * ```
 */
export function ThemeSearchBox({ node, style }: ElementProps) {
  const { stylesheet } = useThemeRender();
  const { t } = useTranslation();
  const { state, setQuery, setSyncQuery, setSourceIds } = useLibrarySelection();
  const { songs } = useSongs();
  const { queuedSongs } = useSync();
  const playlists = useSidebarPlaylists();
  const [open, setOpen] = useState(false);

  const sync = (attrString(node, "scope") ?? "library") === "sync";
  const value = sync ? state.syncQuery : state.query;
  const onChange = sync ? setSyncQuery : setQuery;

  const placeholderKey = attrString(node, "placeholderKey");
  const placeholder =
    placeholderKey === undefined
      ? t("search.placeholder")
      : t(placeholderKey as WmmResourceKey);

  const showSourceFilter = (attrBool(node, "sourceFilter") ?? false) && !sync;
  const showCount = (attrBool(node, "resultCount") ?? false) && !sync;

  const count = useMemo(() => {
    if (!showCount) return 0;
    if (sync) {
      const query = state.syncQuery.trim().toLowerCase();
      if (query === "") return queuedSongs.length;
      return queuedSongs.filter((song) =>
        [song.title, song.album, song.artist, song.genre].some(
          (field) => field !== undefined && field.toLowerCase().includes(query)
        )
      ).length;
    }
    const selection = state.selection;
    const playlistSongIds =
      selection.kind === "playlist"
        ? playlists
            .find((playlist) => playlist.id === selection.id)
            ?.songs.map((entry) => entry.songId)
        : undefined;
    return filterLibrarySongs(songs, state, playlistSongIds).length;
  }, [showCount, sync, state, queuedSongs, songs, playlists]);

  const field = (
    <SearchField
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      showSourceFilter={showSourceFilter}
      sourceIds={state.sourceIds}
      onSourceIdsChange={setSourceIds}
      autoFocus={open}
    />
  );

  if (attrString(node, "presentation") === "button") {
    const styleId = attrRef(node, "style", "button");
    const buttonClass =
      styleId === undefined
        ? stylesheet.defaults.button
        : (stylesheet.classes.button[styleId] ?? stylesheet.defaults.button);
    const display = attrString(node, "display") ?? "iconAndLabel";
    const SearchIcon = THEME_ICONS.search;

    return (
      <WidgetFrame node={node} style={style}>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            render={
              <button
                type="button"
                className={cn(buttonClass, "shrink-0")}
                aria-label={t("search.label")}
              >
                <span
                  aria-hidden
                  style={{
                    display:
                      display === "label"
                        ? "none"
                        : "var(--wmm-icon-display, inline-flex)",
                  }}
                >
                  <SearchIcon
                    style={{
                      width: "var(--wmm-icon-size, 1em)",
                      height: "var(--wmm-icon-size, 1em)",
                    }}
                  />
                </span>
                <span
                  className={display === "icon" ? "sr-only" : undefined}
                  style={{ display: "var(--wmm-label-display, inline)" }}
                >
                  {t("search.label")}
                </span>
              </button>
            }
          />
          <PopoverContent align="end" className="w-80 select-none">
            <div className="flex flex-col gap-2">
              {field}
              {showCount ? (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {t("search.resultCount", [count])}
                </span>
              ) : null}
            </div>
          </PopoverContent>
        </Popover>
      </WidgetFrame>
    );
  }

  return (
    <WidgetFrame node={node} style={style}>
      <div className="flex min-h-0 min-w-0 flex-1 items-center gap-1.5">
        {field}
        {showCount ? (
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
            {t("search.resultCount", [count])}
          </span>
        ) : null}
      </div>
    </WidgetFrame>
  );
}

/** The input itself, with the optional source filter beside it. */
function SearchField({
  value,
  onChange,
  placeholder,
  showSourceFilter,
  sourceIds,
  onSourceIdsChange,
  autoFocus,
}: {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder: string;
  readonly showSourceFilter: boolean;
  readonly sourceIds: string[];
  readonly onSourceIdsChange: (ids: string[]) => void;
  readonly autoFocus: boolean;
}) {
  const { t } = useTranslation();
  const SearchIcon = THEME_ICONS.search;

  return (
    <InputGroup className="min-w-0 flex-1">
      <InputGroupAddon>
        <SearchIcon aria-hidden />
      </InputGroupAddon>
      <InputGroupInput
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label={t("search.label")}
        autoFocus={autoFocus}
        onChange={(event) => onChange(event.target.value)}
      />
      {showSourceFilter ? (
        <InputGroupAddon align="inline-end">
          <SourceFilter
            selected={sourceIds}
            onSelectedChange={onSourceIdsChange}
          />
        </InputGroupAddon>
      ) : null}
    </InputGroup>
  );
}
