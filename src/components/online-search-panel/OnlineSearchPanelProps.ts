import type { IOnlineMetadata } from "@/lib/metadata-providers/online/IOnlineMetadata";
import type { Song } from "@/models";

export type OnlineSearchPanelProps = {
  song: Song;
  onSelect: (result: IOnlineMetadata) => void;
};
