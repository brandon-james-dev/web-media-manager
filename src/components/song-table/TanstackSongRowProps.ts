import type { Song } from "@/models";

export interface TanstackSongRowProps {
  song: Song;
  row: any;
  table: any;
  rowSelection: Record<string, boolean>;
  isEditMultiple: boolean;
  onSongDoubleClicked?(song: Song): void;
  registerRowRef(rowId: string, element: HTMLDivElement | null): void;
}
