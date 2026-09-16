import type { Album } from "@/models";

export interface AlbumDetailDialogProps {
  formId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;

  album: Album;

  onSubmit?: (form: FormData) => void;

  isPrevButtonDisabled?: boolean;
  isNextButtonDisabled?: boolean;

  handlePrevClick?: () => void;
  handleNextClick?: () => void;
}
