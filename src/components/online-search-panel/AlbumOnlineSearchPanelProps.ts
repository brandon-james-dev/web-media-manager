import type { IOnlineAlbumMetadata } from "@/lib/metadata-providers/online/IOnlineAlbumMetadata";
import type { Album } from "@/models";

export interface AlbumOnlineSearchPanelProps {
  album: Album;
  onSelect: (result: IOnlineAlbumMetadata, applyMetadata: boolean) => void;
}
