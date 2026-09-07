import type { IOnlineMetadata } from "@/lib/online-metadata-utils/IOnlineMetadata";
import type { Song } from "@/models";

type OnlineSearchPanelProps = {
  song: Song;
  onSelect: (result: IOnlineMetadata) => void;
};

export type { OnlineSearchPanelProps };
