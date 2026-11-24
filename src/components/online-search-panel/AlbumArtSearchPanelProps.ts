import type { IPicture } from "@/lib/contracts";
import type { Album } from "@/models";

export interface AlbumArtSearchPanelProps {
  album: Album;
  onSelect: (picture: IPicture) => void;
}
