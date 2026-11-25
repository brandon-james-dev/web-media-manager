import type { MetadataPicture } from "@/core/contracts";
import type { Album } from "@/models";

export interface AlbumArtSearchPanelProps {
  album: Album;
  onSelect: (picture: MetadataPicture) => void;
}
