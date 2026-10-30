import type { Album } from "@/models";
import type { AlbumDetailDto } from "@/dto";

export interface AlbumDetailDialogProps {
  formId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;

  album?: Album;

  onSubmit?: (dto: AlbumDetailDto) => void;

  isPrevButtonDisabled?: boolean;
  isNextButtonDisabled?: boolean;

  handlePrevClick?: () => void;
  handleNextClick?: () => void;
}
