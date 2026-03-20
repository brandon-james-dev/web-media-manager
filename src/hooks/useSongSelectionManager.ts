import type React from "react";
import type { Song } from "@/models";

export function useSongSelectionManager(
  _rows: any[],
  _rowSelection: Song[],
  _onRowSelectionChange: (songs: Song[]) => void,
  _isBulkSelectEnabledRef: React.MutableRefObject<boolean>
) {
  return {
    handleClick: (_song: Song, _e: React.MouseEvent) => {},
    handleKeyDown: (_e: React.KeyboardEvent) => {}
  };
}