import type { Album } from "@/models";
import type { CarouselApi } from "../ui/carousel";

export interface CoverFlowProps {
  album: Album;
  index: number;
  api: CarouselApi;
  onClick?: (album: Album) => void;
  onDoubleClick?: (album: Album) => void;
  overlap?: number;
  selectedScale?: number;
  sideScale?: number;
  sideRotation?: number;
  spacing?: number;
  selectedZIndex?: number;
  zIndexBase?: number;
}
