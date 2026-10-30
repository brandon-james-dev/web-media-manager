import type { IOnlineMetadata } from "@/lib/metadata-providers/online/IOnlineMetadata";
import type { Song } from "@/models";

type OnlineSearchPanelProps = {
  song: Song;
  onSelect: (result: IOnlineMetadata) => void;
};

export type { OnlineSearchPanelProps };
