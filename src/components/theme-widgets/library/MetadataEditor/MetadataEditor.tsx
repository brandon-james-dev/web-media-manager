import { useMemo } from "react";
import { cn } from "cn";
import { Editor } from "@/components/editor";
import { QuickEditForm } from "@/components/quick-edit-form";
import { getJobService } from "@/core/jobs";
import { updateTags } from "@/core/metadata";
import { wmmBus } from "@/events";
import { notification$ } from "@/events/notification-events";
import { useSongs } from "@/hooks";
import { useTranslation } from "@/i18n";
import type { QuickEditDto } from "@/dto";
import { attrString } from "@/lib/themes/render";
import type { ElementProps } from "@/lib/themes/render/browser";
import type { Song } from "@/models";
import { uuidv7 } from "uuidv7";
import { useThemeTextClass } from "../../shared/themeText";
import { WidgetFrame } from "../../shared/WidgetFrame";
import { useLibrarySelection } from "../shared/librarySelection";

/**
 * Edits the tags of the songs picked in the page's `TrackList`. `mode="quick"`
 * is the compact field set with its apply button, `full` is the docked
 * editor. With nothing picked, `quick` shows a muted hint and `full` renders
 * nothing so its dock space collapses.
 *
 * @example
 * ```xml
 * <MetadataEditor mode="quick" panel="@panel/inset" labelText="@text/caption" />
 * <MetadataEditor libraryMode="edit" mode="full" height="260" />
 * ```
 * @example
 * ```tsx
 * <RenderNode node={metadataEditor} />
 * ```
 */
export function ThemeMetadataEditor({ node, style }: ElementProps) {
  const { t } = useTranslation();
  const { songs } = useSongs();
  const { state, setSelectedSongIds } = useLibrarySelection();
  const labelClass = useThemeTextClass(node, "labelText");

  const selectedSongs = useMemo(() => {
    const byId = new Map(songs.map((song) => [song.id, song]));
    const picked: Song[] = [];
    for (const id of state.selectedSongIds) {
      const song = byId.get(id);
      if (song !== undefined) picked.push(song);
    }
    return picked;
  }, [songs, state.selectedSongIds]);

  async function handleApply(updates: QuickEditDto): Promise<void> {
    if (selectedSongs.length === 0) return;

    const editUpdates: Partial<Song> = {};
    if (updates.title !== undefined) editUpdates.title = updates.title;
    if (updates.artist !== undefined) editUpdates.artist = updates.artist;
    if (updates.album !== undefined) editUpdates.album = updates.album;
    if (updates.genre !== undefined) editUpdates.genre = updates.genre;
    if (updates.year !== undefined) editUpdates.year = updates.year;
    if (updates.track !== undefined) editUpdates.track = updates.track;
    const cover = updates.coverFront
      ? { coverFront: updates.coverFront }
      : undefined;

    if (selectedSongs.length === 1) {
      const updated = await updateTags(selectedSongs[0], editUpdates, cover);
      notification$.next({
        id: uuidv7(),
        title: t("notification.songUpdated"),
        detail: t("notification.songUpdatedDetail", [
          updated.title ?? "",
          updated.artist ?? "",
        ]),
        state: "completed",
        kind: "Song Edit",
      });
    } else {
      getJobService().enqueue({
        type: "Bulk Edit",
        payload: { songIds: state.selectedSongIds, edits: editUpdates },
      });
    }

    setSelectedSongIds([]);
    wmmBus.publish("wmm.ui.selectionChanged", { songIds: [] });
  }

  if (attrString(node, "mode") === "full") {
    if (selectedSongs.length === 0) return null;
    return (
      <WidgetFrame node={node} style={style}>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <Editor mode="songs" initialSongIds={state.selectedSongIds} />
        </div>
      </WidgetFrame>
    );
  }

  return (
    <WidgetFrame node={node} style={style}>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1.5 overflow-y-auto">
        <span className={cn(labelClass, "truncate")}>
          {selectedSongs.length === 0
            ? t("library.noSelection")
            : t("library.quickEditSelected", [selectedSongs.length])}
        </span>
        {selectedSongs.length === 0 ? null : (
          <QuickEditForm
            songs={selectedSongs}
            onApply={(updates) => void handleApply(updates)}
          />
        )}
      </div>
    </WidgetFrame>
  );
}
