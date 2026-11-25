import { useEffect, useState } from "react";
import type { Song } from "@/models";
import { getSourcesStore } from "@/core/ports";

/**
 * Whether every one of the given songs' sources permits metadata edits.
 *
 * Resolves each song's source by `sourceId` and returns true only when ALL
 * of them expose `metadataWrite` (tags/artwork can be written back). A song
 * whose source cannot be found is treated as non-editable. Used to disable
 * the quick/advanced edit forms when the underlying source (e.g. a read-only
 * remote library) doesn't support write-back.
 */
export function useSourceEditable(songs: Song[]): boolean {
  const [editable, setEditable] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getSourcesStore()
      .getSources()
      .then((sources) => {
        if (cancelled) return;
        const allEditable = songs.every((song) =>
          sources.some(
            (source) =>
              source.id === song.sourceId && source.capabilities.metadataWrite
          )
        );
        setEditable(allEditable);
      })
      .catch(() => {
        if (!cancelled) setEditable(false);
      });

    return () => {
      cancelled = true;
    };
  }, [songs]);

  return editable;
}
